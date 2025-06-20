import { db } from '@/lib/db/connection';
import { transactions } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { DashboardClient } from '@/components/DashboardClient';
import { DateFilter } from '@/components/DateFilter';
import { Suspense } from 'react';

async function getTransactionsAndStats(date?: string | null) {
  try {
    const query = db.select().from(transactions).orderBy(desc(transactions.timestamp));

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      
      query.where(sql`${transactions.timestamp} >= ${startDate.toISOString()} AND ${transactions.timestamp} <= ${endDate.toISOString()}`);
    } else {
      query.limit(100);
    }

    const fetchedTransactions = await query;
    
    const totalIncome = fetchedTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpense = fetchedTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const stats = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: fetchedTransactions.length
    };

    return { transactions: fetchedTransactions, stats };

  } catch (error) {
    console.error("Failed to fetch initial data:", error);
    return { 
      transactions: [], 
      stats: { totalIncome: 0, totalExpense: 0, netBalance: 0, transactionCount: 0 } 
    };
  }
}

export default async function BankIncomeDashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {

  const { transactions, stats } = await getTransactionsAndStats(searchParams.date);

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