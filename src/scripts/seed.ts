import 'dotenv/config';
import { db } from '../lib/db/connection';
import { accounts, transactions } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🌱 Starting to seed the database...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await db.delete(transactions);
  await db.delete(accounts);

  // --- Create Accounts ---
  console.log('🏦 Creating mock accounts...');
  const mockAccounts = [
    {
      accountNumber: '1234567890',
      accountName: 'นาย สมชาย ใจดี',
      bankName: 'ธนาคารไทยพาณิชย์',
      balance: '50000.00',
    },
    {
      accountNumber: '0987654321',
      accountName: 'นางสาว สมศรี มีสุข',
      bankName: 'ธนาคารกสิกรไทย',
      balance: '75000.00',
    },
  ];
  await db.insert(accounts).values(mockAccounts);
  console.log('✅ Accounts created.');

  // --- Create Transactions ---
  console.log('💸 Creating mock transactions...');
  const mockTransactions = [
    // Transactions for account 1234567890
    {
      accountNumber: '1234567890',
      type: 'deposit',
      amount: '1500.00',
      description: 'เงินเดือนเข้า',
      rawMessage: 'mock deposit message 1',
    },
    {
      accountNumber: '1234567890',
      type: 'withdraw',
      amount: '250.00',
      description: 'ซื้อของที่ 7-11',
      rawMessage: 'mock withdraw message 1',
    },
    {
      accountNumber: '1234567890',
      type: 'deposit',
      amount: '300.00',
      description: 'ได้รับเงินโอน',
      rawMessage: 'mock deposit message 2',
    },
    // Transactions for account 0987654321
    {
      accountNumber: '0987654321',
      type: 'deposit',
      amount: '20000.00',
      description: 'โบนัสพิเศษ',
      rawMessage: 'mock deposit message 3',
    },
    {
      accountNumber: '0987654321',
      type: 'withdraw',
      amount: '1200.00',
      description: 'จ่ายค่าอินเทอร์เน็ต',
      rawMessage: 'mock withdraw message 2',
    },
  ];

  await db.insert(transactions).values(mockTransactions);
  console.log('✅ Transactions created.');

  // --- Update account balances based on transactions ---
  console.log('🔄 Updating account balances...');
  const allAccounts = await db.select().from(accounts);
  for (const account of allAccounts) {
    const result = await db
      .select({
        totalDeposits: sql<string>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), '0')`,
        totalWithdraws: sql<string>`COALESCE(SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END), '0')`,
      })
      .from(transactions)
      .where(sql`${transactions.accountNumber} = ${account.accountNumber}`);

    const { totalDeposits, totalWithdraws } = result[0];
    const newBalance = parseFloat(totalDeposits) - parseFloat(totalWithdraws);
    
    await db
      .update(accounts)
      .set({ balance: newBalance.toFixed(2) })
      .where(sql`${accounts.accountNumber} = ${account.accountNumber}`);

    console.log(`   -> Updated balance for account ${account.accountNumber} to ${newBalance.toFixed(2)}`);
  }
  console.log('✅ Account balances updated.');


  console.log('🎉 Database seeding completed successfully!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ An error occurred during database seeding:', error);
  process.exit(1);
}); 