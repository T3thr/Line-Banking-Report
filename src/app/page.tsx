// src/app/page.tsx

import { Transaction, transactions } from '@/lib/db/schema';
import { DashboardClient, DashboardStats } from '@/components/DashboardClient';
import { DateFilter } from '@/components/DateFilter';
import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { desc, sql } from 'drizzle-orm';

// ย้าย Logic การดึงข้อมูลมาไว้ที่นี่โดยตรง เพื่อให้ Server Component เรียกใช้ได้เลย
async function getDashboardData(date?: string | null): Promise<{ transactions: Transaction[], stats: DashboardStats }> {
  try {
    // --- Logic จาก /api/transactions ---
    const transactionQuery = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.timestamp));

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      
      // การใช้ sql`` จาก Drizzle เป็นวิธีที่ปลอดภัยกว่า
      transactionQuery.where(sql`${transactions.timestamp} >= ${startDate} AND ${transactions.timestamp} <= ${endDate}`);
    } else {
        // หากไม่มีวันที่ อาจจะแสดงแค่ 100 รายการล่าสุด
        transactionQuery.limit(100);
    }
    const fetchedTransactions = await transactionQuery;

    // --- Logic จาก /api/stats ---
    const totalIncome = fetchedTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpense = fetchedTransactions
      .filter(t => t.type === 'withdraw' || t.type === 'transfer') // 'transfer' ควรนับเป็นรายจ่าย
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const stats: DashboardStats = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: fetchedTransactions.length
    };

    return { transactions: fetchedTransactions, stats };

  } catch (error) {
    console.error("Failed to fetch initial data directly from database:", error);
    // ในกรณีที่เกิดข้อผิดพลาด ให้คืนค่าว่างเพื่อไม่ให้หน้าเว็บพัง
    return { 
      transactions: [], 
      stats: { totalIncome: 0, totalExpense: 0, netBalance: 0, transactionCount: 0 } 
    };
  }
}

// แก้ไข Interface ให้ถูกต้อง: searchParams เป็น object ธรรมดา
interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function BankIncomeDashboardPage({ searchParams }: PageProps) {
  // ไม่ต้อง await searchParams แล้ว
  const date = Array.isArray(searchParams.date) 
    ? searchParams.date[0] 
    : searchParams.date;
  
  const { transactions, stats } = await getDashboardData(date);
  
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                📊 Dashboard รายรับ-รายจ่าย
              </h1>
              <p className="text-muted-foreground mt-1">
                ติดตามธุรกรรมแบบ Real-time จาก LINE Banking
              </p>
            </div>
          <Suspense fallback={<div>Loading date filter...</div>}>
            <DateFilter />
          </Suspense>
        </header>
        <DashboardClient initialTransactions={transactions} initialStats={stats} />
      </div>
    </div>
  );
}