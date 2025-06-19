// app/api/accounts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true));

    return NextResponse.json(allAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountNumber, accountName, bankName } = body;

    const newAccount = await db
      .insert(accounts)
      .values({
        accountNumber,
        accountName,
        bankName,
        balance: '0.00',
        isActive: true,
      })
      .returning();

    return NextResponse.json(newAccount[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}