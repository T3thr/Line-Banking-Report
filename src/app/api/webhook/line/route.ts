// app/api/webhook/line/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client, validateSignature } from '@line/bot-sdk';
import { db } from '@/lib/db/connection';
import { transactions, accounts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Pusher from 'pusher';
import { BankMessageParser } from '@/lib/utils/message-parser';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// อัพเดตยอดเงินในบัญชี
async function updateAccountBalance(accountNumber: string, amount: number, type: string) {
  // ค้นหาบัญชีที่มีอยู่
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.accountNumber, accountNumber))
    .limit(1);

  if (account.length === 0) {
    // สร้างบัญชีใหม่ถ้าไม่มี โดยใช้ accountNumber ที่มีเซนเซอร์
    // ตรวจสอบ ID ล่าสุดในตาราง accounts
    const lastAccount = await db
      .select({ id: accounts.id })
      .from(accounts)
      .orderBy(desc(accounts.id))
      .limit(1);

    const newAccountId = lastAccount.length > 0 ? lastAccount[0].id + 1 : 1;

    await db.insert(accounts).values({
      id: newAccountId,
      accountNumber,
      accountName: `Account ${accountNumber}`,
      bankName: 'Unknown Bank',
      balance: type === 'deposit' ? amount.toString() : (-amount).toString(),
      isActive: true,
      createdAt: new Date(),
    });
  } else {
    // อัปเดตยอดเงิน
    const currentBalance = parseFloat(account[0].balance || '0');
    const newBalance = type === 'deposit' 
      ? currentBalance + amount 
      : currentBalance - amount;

    await db
      .update(accounts)
      .set({ balance: newBalance.toString() })
      .where(eq(accounts.accountNumber, accountNumber));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // ตรวจสอบ signature
    if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    
    for (const event of data.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const messageText = event.message.text;
        
        // แยกข้อมูลจากข้อความธนาคาร
        const transactionData = BankMessageParser.parse(messageText);
        
        if (transactionData) {
          // ตรวจสอบ ID ล่าสุดในตาราง transactions
          const lastTransaction = await db
            .select({ id: transactions.id })
            .from(transactions)
            .orderBy(desc(transactions.id))
            .limit(1);

          const newId = lastTransaction.length > 0 ? lastTransaction[0].id + 1 : 1;

          // บันทึกธุรกรรมใหม่โดยใช้ accountNumber ที่มีเซนเซอร์
          const [newTransaction] = await db
            .insert(transactions)
            .values({
              id: newId,
              type: transactionData.type,
              accountNumber: transactionData.accountNumber, // ใช้ accountNumber ที่มีเซนเซอร์
              amount: transactionData.amount.toString(),
              description: transactionData.description,
              rawMessage: transactionData.rawMessage,
              timestamp: new Date(),
              processed: false,
              createdAt: new Date(),
            })
            .returning();

          // อัปเดตยอดเงินในบัญชี
          await updateAccountBalance(transactionData.accountNumber, transactionData.amount, transactionData.type);

          // ส่งการอัปเดตแบบ real-time ผ่าน Pusher
          await pusher.trigger('transactions', 'new-transaction', {
            transaction: newTransaction,
            accountNumber: transactionData.accountNumber,
          });

          // ตอบกลับใน LINE OA โดยใช้ accountNumber ที่มีเซนเซอร์
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ บันทึกธุรกรรมเรียบร้อย\n💰 ${transactionData.type === 'deposit' ? 'รับเงิน' : 'จ่ายเงิน'}: ฿${transactionData.amount.toLocaleString()}\n🏦 บัญชี: ${transactionData.accountNumber}`,
          });
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}