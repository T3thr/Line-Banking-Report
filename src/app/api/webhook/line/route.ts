// app/api/webhook/line/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client, validateSignature } from '@line/bot-sdk';
import { db } from '@/lib/db/connection';
import { transactions, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Pusher from 'pusher';

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

// ฟังก์ชันแยกข้อมูลจากข้อความธนาคาร
function parseBankMessage(message: string) {
  // รูปแบบ: "Main Account(xxx-x-xxxxx-x) withdraw/Transfer ฿1,000.00 (Transfer Withdrawal)"
  const patterns = [
    /Main Account\(([^)]+)\)\s+(withdraw|deposit|transfer)\s*฿?([0-9,]+\.?\d*)/i,
    /บัญชี[^\(]*\(([^)]+)\)\s+(ฝาก|ถอน|โอน)\s*฿?([0-9,]+\.?\d*)/i,
    /Account\s*\(([^)]+)\)\s+(credit|debit)\s*฿?([0-9,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const accountNumber = match[1].replace(/x/g, '').replace(/-/g, '');
      const type = normalizeTransactionType(match[2].toLowerCase());
      const amount = parseFloat(match[3].replace(/,/g, ''));
      
      return {
        accountNumber,
        type,
        amount,
        description: extractDescription(message),
        rawMessage: message,
      };
    }
  }
  
  return null;
}

function normalizeTransactionType(type: string): 'deposit' | 'withdraw' | 'transfer' {
  if (type.includes('deposit') || type.includes('ฝาก') || type.includes('credit')) {
    return 'deposit';
  }
  if (type.includes('withdraw') || type.includes('ถอน') || type.includes('debit')) {
    return 'withdraw';
  }
  return 'transfer';
}

function extractDescription(message: string): string {
  // ดึงข้อมูลเพิ่มเติมจากวงเล็บ
  const descMatch = message.match(/\(([^)]*(?:Transfer|Withdrawal|Deposit)[^)]*)\)/i);
  return descMatch ? descMatch[1] : '';
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
        const transactionData = parseBankMessage(messageText);
        
        if (transactionData) {
          // บันทึกข้อมูลธุรกรรม
          const [newTransaction] = await db
            .insert(transactions)
            .values({
              ...transactionData,
              amount: transactionData.amount.toString(),
            })
            .returning();

          // อัปเดตยอดเงินในบัญชี
          await updateAccountBalance(transactionData.accountNumber, transactionData.amount, transactionData.type);

          // ส่งข้อมูลแบบ real-time
          await pusher.trigger('transactions', 'new-transaction', {
            transaction: newTransaction,
            accountNumber: transactionData.accountNumber,
          });

          // ตอบกลับใน LINE (ถ้าต้องการ)
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

async function updateAccountBalance(accountNumber: string, amount: number, type: string) {
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.accountNumber, accountNumber))
    .limit(1);

  if (account.length === 0) {
    // สร้างบัญชีใหม่ถ้าไม่มี
    await db.insert(accounts).values({
      accountNumber,
      accountName: `Account ${accountNumber}`,
      bankName: 'Unknown Bank',
      balance: type === 'deposit' ? amount.toString() : (-amount).toString(),
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