'use client'
import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import Pusher from 'pusher-js';

interface Transaction {
  id: number;
  accountNumber: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: string;
  description: string;
  timestamp: string;
  processed: boolean;
}

interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  bankName: string;
  balance: string;
  isActive: boolean;
}

interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

export default function BankIncomeDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    transactionCount: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // เชื่อมต่อ Pusher สำหรับ real-time updates
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('transactions');
    
    channel.bind('new-transaction', (data: any) => {
      setTransactions(prev => [data.transaction, ...prev.slice(0, 49)]);
      setLastUpdate(new Date());
    });

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true);
    });

    // โหลดข้อมูลเริ่มต้น
    loadInitialData();

    return () => {
      pusher.unsubscribe('transactions');
      pusher.disconnect();
    };
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateStats();
    }
  }, [transactions]);

  const loadInitialData = async () => {
    try {
      const [transactionsRes, accountsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/accounts')
      ]);
      
      const transactionsData = await transactionsRes.json();
      const accountsData = await accountsRes.json();
      
      setTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateStats = () => {
    const totalIncome = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    setStats({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: transactions.length
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              📊 Dashboard รายได้ธนาคาร
            </h1>
            <p className="text-slate-600 mt-1">
              ติดตามธุรกรรมแบบ Real-time จาก LINE Banking
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-sm text-slate-600">
              {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
            </span>
            <span className="text-xs text-slate-500">
              อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">รายได้รวม</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">รายจ่ายรวม</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalExpense)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ยอดคงเหลือสุทธิ</p>
                <p className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.netBalance)}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">ธุรกรรมรวม</p>
                <p className="text-2xl font-bold text-slate-700">
                  {stats.transactionCount.toLocaleString()}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              📝 ธุรกรรมล่าสุด
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>ยังไม่มีธุรกรรม</p>
                <p className="text-sm">รอการแจ้งเตือนจาก LINE Banking</p>
              </div>
            ) : (
              transactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">
                            บัญชี {transaction.accountNumber}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === 'deposit' ? 'รับเงิน' : 
                             transaction.type === 'withdraw' ? 'จ่ายเงิน' : 'โอนเงิน'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {transaction.description || 'ไม่มีรายละเอียด'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(transaction.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
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
    </div>
  );
}