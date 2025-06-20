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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // รอการแก้ไข params จาก Promise
    const { id } = await context.params;
    const transactionId = parseInt(id, 10);

    // ตรวจสอบว่า ID เป็นตัวเลขที่ถูกต้อง
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'รหัสธุรกรรมไม่ถูกต้อง' }, { status: 400 });
    }

    // ลบรายการธุรกรรมจากฐานข้อมูล
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, transactionId))
      .returning();

    // ตรวจสอบว่ามีการลบรายการหรือไม่
    if (result.length === 0) {
      return NextResponse.json({ error: 'ไม่พบธุรกรรม' }, { status: 404 });
    }

    // ส่งการอัปเดทแบบ real-time ผ่าน Pusher
    await pusher.trigger('transactions', 'delete-transaction', {
      transactionId,
    });

    return NextResponse.json({ message: 'ลบธุรกรรมสำเร็จ' }, { status: 200 });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลบธุรกรรม:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบธุรกรรมได้' }, { status: 500 });
  }
}