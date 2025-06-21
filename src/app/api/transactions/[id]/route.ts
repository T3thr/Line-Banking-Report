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
  const transactionId = parseInt(params.id, 10);

  // Check if transactionId is valid
  if (isNaN(transactionId)) {
    return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
  }

  try {
    // Delete the transaction from the database
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, transactionId))
      .returning();

    // Check if the transaction was deleted
    if (result.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Send real-time update via Pusher
    await pusher.trigger('transactions', 'delete-transaction', {
      transactionId,
    });

    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}