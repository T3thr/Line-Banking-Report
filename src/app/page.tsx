import { Transaction } from '@/lib/db/schema';
import { DashboardClient, DashboardStats } from '@/components/DashboardClient';
import { DateFilter } from '@/components/DateFilter';
import { Suspense } from 'react';

// This function now fetches data from our API endpoints
async function getDashboardData(date?: string | null): Promise<{transactions: Transaction[], stats: DashboardStats}> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const dateQuery = date ? `?date=${date}` : '';
    const transactionsUrl = `${baseUrl}/api/transactions${dateQuery}`;
    const statsUrl = `${baseUrl}/api/stats${dateQuery}`;
    
    const [transactionsRes, statsRes] = await Promise.all([
      fetch(transactionsUrl, { cache: 'no-store' }),
      fetch(statsUrl, { cache: 'no-store' })
    ]);
    
    if (!transactionsRes.ok || !statsRes.ok) {
      console.error('Failed to fetch data:', { 
        transactionsStatus: transactionsRes.status,
        statsStatus: statsRes.status
      });
      throw new Error('Failed to fetch dashboard data');
    }
    
    const transactions: Transaction[] = await transactionsRes.json();
    const stats: DashboardStats = await statsRes.json();
    
    return { transactions, stats };
  } catch (error) {
    console.error("Failed to fetch initial data from API:", error);
    // Return empty state
    return { 
      transactions: [], 
      stats: { totalIncome: 0, totalExpense: 0, netBalance: 0, transactionCount: 0 } 
    };
  }
}

export default async function BankIncomeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const date = Array.isArray(resolvedSearchParams.date) ? resolvedSearchParams.date[0] : resolvedSearchParams.date;
  const { transactions, stats } = await getDashboardData(date);
  
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Suspense fallback={<div>Loading date filter...</div>}>
            <DateFilter />
          </Suspense>
        </div>
        <DashboardClient initialTransactions={transactions} initialStats={stats} />
      </div>
    </div>
  );
}