// src/app/page.tsx

import { Transaction, transactions } from '@/lib/db/schema';
import { DashboardClient, DashboardStats } from '@/components/DashboardClient';
import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { desc, sql, count } from 'drizzle-orm';
import { FilterControls } from '@/components/FilterControls';
import { PaginationControls } from '@/components/PaginationControls';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

interface SearchParams {
  [key: string]: string | undefined;
}

// Logic การดึงข้อมูลยังคงเหมือนเดิม (ถูกต้องและมีประสิทธิภาพ)
async function getDashboardData(searchParams: SearchParams): Promise<{
  transactions: Transaction[];
  stats: DashboardStats;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const filterType = searchParams.filterType || 'monthly';
    const page = parseInt(searchParams.page || '1', 10);
    const limit = parseInt(searchParams.limit || '10', 10);
    const offset = (page - 1) * limit;

    let startDate: Date, endDate: Date;

    if (filterType === 'daily' && searchParams.date) {
      startDate = new Date(searchParams.date);
      endDate = new Date(searchParams.date);
    } else {
      const year = parseInt(searchParams.year || new Date().getFullYear().toString(), 10);
      const month = searchParams.month
        ? parseInt(searchParams.month, 10) - 1
        : new Date().getMonth();
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    }

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const dateFilter =
      filterType === 'all'
        ? sql`1=1`
        : sql`${transactions.timestamp} >= ${startDate.toISOString()} AND ${transactions.timestamp} <= ${endDate.toISOString()}`;

    // Query for transactions with pagination
    const fetchedTransactions = await db
      .select()
      .from(transactions)
      .where(dateFilter)
      .orderBy(desc(transactions.timestamp))
      .limit(limit)
      .offset(offset);

    // Query for total count for pagination
    const totalCountResult = await db
      .select({ value: count() })
      .from(transactions)
      .where(dateFilter);

    const totalCount = totalCountResult[0].value;
    const totalPages = Math.ceil(totalCount / limit);

    // Query for stats (without pagination)
    const allFilteredTransactions = await db.select().from(transactions).where(dateFilter);

    const totalIncome = allFilteredTransactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpense = allFilteredTransactions
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const stats: DashboardStats = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: allFilteredTransactions.length,
    };

    return { transactions: fetchedTransactions, stats, totalPages, currentPage: page };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return {
      transactions: [],
      stats: { totalIncome: 0, totalExpense: 0, netBalance: 0, transactionCount: 0 },
      totalPages: 0,
      currentPage: 1,
    };
  }
}

export default async function BankIncomeDashboardPage({ searchParams: searchParamsPromise }: { searchParams: Promise<SearchParams> }) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get('admin_session')?.value === 'true';

  if (!isAdmin) {
    redirect('/login');
  }

  // Await searchParams to resolve the Promise
  const searchParams = await searchParamsPromise;

  const { transactions, stats, totalPages, currentPage } = await getDashboardData(searchParams);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            รายรับ-รายจ่ายของชุมชน
          </h1>
          <p className="text-lg text-muted-foreground">
            แดชบอร์ดสรุปธุรกรรมทางการเงินแบบ Real-time
          </p>
        </header>

        <Suspense fallback={<div className="h-20 w-full bg-muted rounded-lg animate-pulse" />}>
          <FilterControls />
        </Suspense>

        <DashboardClient initialTransactions={transactions} initialStats={stats} />

        {totalPages > 1 && (
          <Suspense fallback={<div className="h-12 w-full bg-muted rounded-lg animate-pulse" />}>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} />
          </Suspense>
        )}
      </main>
    </div>
  );
}