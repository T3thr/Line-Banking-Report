// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const query = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.timestamp));

    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);
      
      query.where(sql`${transactions.timestamp} >= ${startDate.toISOString()} AND ${transactions.timestamp} <= ${endDate.toISOString()}`);
    } else {
      query.limit(100);
    }

    // ดึงข้อมูลธุรกรรมตามเงื่อนไข
    const allTransactions = await query;

    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลธุรกรรม:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลธุรกรรมได้' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, accountNumber, amount, description, rawMessage } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!type || !accountNumber || !amount) {
      return NextResponse.json({ error: 'ข้อมูลที่จำเป็นไม่ครบถ้วน' }, { status: 400 });
    }

    // ตรวจสอบ ID ล่าสุดในตาราง transactions
    const lastTransaction = await db
      .select({ id: transactions.id })
      .from(transactions)
      .orderBy(desc(transactions.id))
      .limit(1);

    const newId = lastTransaction.length > 0 ? lastTransaction[0].id + 1 : 1;

    // บันทึกธุรกรรมใหม่
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        id: newId,
        type,
        accountNumber,
        amount: parseFloat(amount).toFixed(2),
        description: description || '',
        rawMessage: rawMessage || '',
        timestamp: new Date(),
        processed: false,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(newTransaction);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างธุรกรรม:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างธุรกรรมได้' }, { status: 500 });
  }
}