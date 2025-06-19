// lib/db/schema.ts
import { pgTable, serial, varchar, decimal, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  accountNumber: varchar('account_number', { length: 20 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'deposit', 'withdraw', 'transfer'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  rawMessage: text('raw_message').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  processed: boolean('processed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  accountNumber: varchar('account_number', { length: 20 }).unique().notNull(),
  accountName: varchar('account_name', { length: 100 }).notNull(),
  bankName: varchar('bank_name', { length: 50 }).notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0.00').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;