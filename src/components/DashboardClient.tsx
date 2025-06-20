'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import Pusher from 'pusher-js';
import type { Transaction } from '@/lib/db/schema';

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

interface NewTransactionPayload {
  transaction: Transaction;
}

interface DashboardClientProps {
  initialTransactions: Transaction[];
  initialStats: DashboardStats;
}

export function DashboardClient({ initialTransactions, initialStats }: DashboardClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const calculateStats = useCallback((currentTransactions: Transaction[]) => {
    const totalIncome = currentTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpense = currentTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    setStats({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: currentTransactions.length
    });
  }, []);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('transactions');
    
    channel.bind('new-transaction', (data: NewTransactionPayload) => {
      setTransactions(prev => {
        const newTransactions = [data.transaction, ...prev];
        calculateStats(newTransactions);
        return newTransactions;
      });
      setLastUpdate(new Date());
    });

    channel.bind('pusher:subscription_succeeded', () => setIsConnected(true));
    channel.bind('pusher:subscription_error', () => setIsConnected(false));


    return () => {
      pusher.unsubscribe('transactions');
      pusher.disconnect();
    };
  }, [calculateStats]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case 'withdraw':
        return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'withdraw':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              📊 Dashboard รายได้ธนาคาร
            </h1>
            <p className="text-muted-foreground mt-1">
              ติดตามธุรกรรมแบบ Real-time จาก LINE Banking
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
            </span>
            <span className="text-xs text-muted-foreground">
              อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')}
            </span>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">รายได้รวม</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">รายจ่ายรวม</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpense)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ยอดคงเหลือสุทธิ</p>
              <p className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stats.netBalance)}</p>
            </div>
            <Wallet className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ธุรกรรมรวม</p>
              <p className="text-2xl font-bold">{stats.transactionCount.toLocaleString()}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">📝 ธุรกรรมล่าสุด</h2>
        </div>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-border" />
              <p>ยังไม่มีธุรกรรมสำหรับวันที่เลือก</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">บัญชี {transaction.accountNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(transaction.type)}`}>
                           {transaction.type === 'deposit' ? 'รับเงิน' : 
                             transaction.type === 'withdraw' ? 'จ่ายเงิน' : 'โอนเงิน'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{transaction.description || 'ไม่มีรายละเอียด'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 