// src/app/api/transactions/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Pusher from 'pusher';

export const dynamic = 'force-dynamic';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // ลบรายการธุรกรรมจากฐานข้อมูล
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, Number(id)))
      .returning();

    // ตรวจสอบว่ามีการลบรายการหรือไม่
    if (result.length === 0) {
      return NextResponse.json({ error: 'ไม่พบธุรกรรม' }, { status: 404 });
    }

    // ส่งการอัปเดตแบบ real-time ผ่าน Pusher
    await pusher.trigger('transactions', 'delete-transaction', {
      transactionId: Number(id),
    });

    return NextResponse.json({ message: 'ลบธุรกรรมสำเร็จ' }, { status: 200 });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบธุรกรรม:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบธุรกรรมได้' }, { status: 500 });
  }
}