// app/api/accounts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // ดึงข้อมูลบัญชีที่ยังใช้งานอยู่
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true));

    return NextResponse.json(allAccounts);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลบัญชีได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountNumber, accountName, bankName } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!accountNumber || !accountName || !bankName) {
      return NextResponse.json({ error: 'ข้อมูลที่จำเป็นไม่ครบถ้วน' }, { status: 400 });
    }

    // ตรวจสอบ ID ล่าสุดในตาราง accounts
    const lastAccount = await db
      .select({ id: accounts.id })
      .from(accounts)
      .orderBy(desc(accounts.id))
      .limit(1);

    const newAccountId = lastAccount.length > 0 ? lastAccount[0].id + 1 : 1;

    // สร้างบัญชีใหม่
    const newAccount = await db
      .insert(accounts)
      .values({
        id: newAccountId,
        accountNumber,
        accountName,
        bankName,
        balance: '0.00',
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(newAccount[0]);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการสร้างบัญชี:', error);
    return NextResponse.json({ error: 'ไม่สามารถสร้างบัญชีได้' }, { status: 500 });
  }
}