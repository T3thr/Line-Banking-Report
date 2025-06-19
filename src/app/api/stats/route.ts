// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions } from '@/lib/db/schema';
import { eq, sum, count, gte } from 'drizzle-orm';

export async function GET() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // สถิติรายวัน
    const dailyStats = await db
      .select({
        type: transactions.type,
        total: sum(transactions.amount),
        count: count(transactions.id),
      })
      .from(transactions)
      .where(gte(transactions.timestamp, startOfDay))
      .groupBy(transactions.type);

    // สถิติรายเดือน
    const monthlyStats = await db
      .select({
        type: transactions.type,
        total: sum(transactions.amount),
        count: count(transactions.id),
      })
      .from(transactions)
      .where(gte(transactions.timestamp, startOfMonth))
      .groupBy(transactions.type);

    // สถิติรวม
    const totalStats = await db
      .select({
        type: transactions.type,
        total: sum(transactions.amount),
        count: count(transactions.id),
      })
      .from(transactions)
      .groupBy(transactions.type);

    return NextResponse.json({
      daily: dailyStats,
      monthly: monthlyStats,
      total: totalStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}