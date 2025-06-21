// src/components/DashboardClient.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MoreHorizontal,
  Calculator,
  Trash2,
} from 'lucide-react';
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

interface DeleteTransactionPayload {
  transactionId: number;
}

interface DashboardClientProps {
  initialTransactions: Transaction[];
  initialStats: DashboardStats;
}

const LIMIT_OPTIONS = [5, 10, 15, 20, 50];

export function DashboardClient({ initialTransactions, initialStats }: DashboardClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }));
  const [limit, setLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('transactions_limit')) || 10;
    }
    return 10;
  });
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdraw'>('all'); // State สำหรับ tab ที่เลือก

  // บันทึก limit ลง localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('transactions_limit', String(limit));
    }
  }, [limit]);

  // รีเซ็ตหน้าเมื่อ limit หรือ initialTransactions เปลี่ยน
  useEffect(() => {
    setPage(1);
  }, [limit, initialTransactions]);

  // อัพเดทนาฬิกาแบบ real-time ทุกวินาที
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // กรอง transactions ตาม tab ที่เลือก
  const filteredTransactions = activeTab === 'all'
    ? transactions // ใช้ transactions แทน initialTransactions เพื่อสะท้อน real-time updates
    : transactions.filter((t) => t.type === activeTab);

  // คำนวณหน้า pagination ตาม transactions ที่กรองแล้ว
  const totalPages = Math.ceil(filteredTransactions.length / limit);
  const paginatedTransactions = filteredTransactions.slice((page - 1) * limit, page * limit);

  // คำนวณสถิติจาก transactions
  const calculateStats = useCallback((currentTransactions: Transaction[], newStats?: DashboardStats) => {
    if (newStats) {
      setStats(newStats);
      return;
    }
    const totalIncome = currentTransactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = currentTransactions
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    setStats({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: currentTransactions.length,
    });
  }, []);

  // อัพเดท transactions และ stats เมื่อ initialTransactions หรือ initialStats เปลี่ยน
  useEffect(() => {
    calculateStats(initialTransactions, initialStats);
    setTransactions(initialTransactions);
  }, [initialTransactions, initialStats, calculateStats]);

  // อัพเดท stats เมื่อ transactions เปลี่ยน (จาก Pusher หรือการลบ)
  useEffect(() => {
    calculateStats(transactions);
  }, [transactions, calculateStats]);

  // ตั้งค่า Pusher สำหรับ real-time updates
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      forceTLS: true,
    });

    const channel = pusher.subscribe('transactions');

    // จัดการธุรกรรมใหม่
    channel.bind('new-transaction', (data: NewTransactionPayload) => {
      setTransactions((prev) => [data.transaction, ...prev]);
      setLastUpdate(new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }));
    });

    // จัดการการลบธุรกรรม
    channel.bind('delete-transaction', (data: DeleteTransactionPayload) => {
      setTransactions((prev) => prev.filter((t) => t.id !== data.transactionId));
      setLastUpdate(new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' }));
    });

    channel.bind('pusher:subscription_succeeded', () => setIsConnected(true));
    channel.bind('pusher:subscription_error', () => setIsConnected(false));

    // จัดการการเชื่อมต่อขาด
    pusher.connection.bind('disconnected', () => setIsConnected(false));
    pusher.connection.bind('connected', () => setIsConnected(true));

    return () => {
      pusher.unsubscribe('transactions');
      pusher.disconnect();
    };
  }, []);

  // รูปแบบตัวเลขเป็นสกุลเงินบาท
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // รูปแบบวันที่และเวลา
  const formatDate = (date: string | Date) => {
    const utcDate = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return utcDate.toLocaleString('th-TH', options);
  };

  // เลือกไอคอนตามประเภทธุรกรรม
  const getTransactionIcon = (type: string) => {
    const className = 'w-6 h-6';
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className={`${className} text-green-500`} />;
      case 'withdraw':
        return <ArrowDownCircle className={`${className} text-red-500`} />;
      default:
        return <MoreHorizontal className={`${className} text-blue-500`} />;
    }
  };

  // ลบธุรกรรมพร้อมยืนยัน
  const handleDeleteTransaction = async (transactionId: number) => {
    const confirmed = window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบธุรกรรมนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // อัพเดท UI ทันทีโดยลบธุรกรรมออกจาก state (Pusher จะจัดการการ sync กับ client อื่น)
        setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      } else {
        alert('เกิดข้อผิดพลาดในการลบธุรกรรม กรุณาลองอีกครั้ง');
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('เกิดข้อผิดพลาดในการลบธุรกรรม กรุณาลองอีกครั้ง');
    }
  };

  return (
    <div className="space-y-6">
      {/* สถานะการเชื่อมต่อและนาฬิกา real-time */}
      <div className="flex items-center justify-end space-x-3 text-sm text-muted-foreground">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            isConnected ? 'bg-green-500' : 'bg-red-400'
          }`}
        ></div>
        <span>
          {isConnected ? 'เชื่อมต่อ Real-time' : 'ไม่ได้เชื่อมต่อ'} | อัปเดตล่าสุด: {lastUpdate}
        </span>
      </div>

      {/* การ์ดแสดงสถิติ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          icon={TrendingUp}
          title="รายรับรวม"
          value={formatCurrency(stats.totalIncome)}
          color="text-green-600"
        />
        <StatCard
          icon={TrendingDown}
          title="รายจ่ายรวม"
          value={formatCurrency(stats.totalExpense)}
          color="text-red-600"
        />
        <StatCard
          icon={Wallet}
          title="ยอดคงเหลือสุทธิ"
          value={formatCurrency(stats.netBalance)}
          color={stats.netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}
        />
        <StatCard
          icon={Calculator}
          title="จำนวนธุรกรรม"
          value={stats.transactionCount.toLocaleString()}
        />
      </div>

      {/* แท็บสำหรับกรองประเภทธุรกรรม */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {[
          { id: 'all', label: 'ทั้งหมด', count: transactions.length },
          {
            id: 'deposit',
            label: 'รับเงิน',
            count: transactions.filter((t) => t.type === 'deposit').length,
          },
          {
            id: 'withdraw',
            label: 'จ่ายเงิน',
            count: transactions.filter((t) => t.type === 'withdraw').length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'all' | 'deposit' | 'withdraw');
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* การควบคุมจำนวนรายการและ pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">แสดง:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} รายการ/หน้า
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded disabled:opacity-50 hover:bg-muted"
            title="หน้าแรก"
            aria-label="หน้าแรก"
          >
            ⏮️
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded disabled:opacity-50 hover:bg-muted"
            title="หน้าก่อนหน้า"
            aria-label="หน้าก่อนหน้า"
          >
            ◀️
          </button>
          <span className="text-sm mx-2">
            หน้า {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="p-2 rounded disabled:opacity-50 hover:bg-muted"
            title="หน้าถัดไป"
            aria-label="หน้าถัดไป"
          >
            ▶️
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || totalPages === 0}
            className="p-2 rounded disabled:opacity-50 hover:bg-muted"
            title="หน้าสุดท้าย"
            aria-label="หน้าสุดท้าย"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* รายการธุรกรรม */}
      <div className="bg-card text-card-foreground rounded-lg shadow-sm border">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">ธุรกรรมล่าสุด</h2>
        </div>
        <div className="divide-y divide-border">
          {paginatedTransactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-border" />
              <p className="font-semibold">ไม่พบข้อมูลธุรกรรม</p>
              <p className="text-sm">ลองเปลี่ยนตัวกรองหรือเลือกช่วงเวลาอื่น</p>
            </div>
          ) : (
            paginatedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 hover:bg-muted/50 transition-colors flex items-center space-x-4"
              >
                <div className="p-2 bg-muted rounded-full">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 items-center">
                  <div className="sm:col-span-1">
                    <p className="font-semibold text-foreground">
                      {transaction.type === 'deposit'
                        ? 'รับเงิน'
                        : transaction.type === 'withdraw'
                        ? 'จ่ายเงิน'
                        : 'โอนเงิน'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      บช. {transaction.accountNumber}
                    </p>
                  </div>
                  <div className="sm:col-span-1 text-sm text-muted-foreground">
                    <p>{transaction.description || 'ไม่มีรายละเอียด'}</p>
                    <p className="text-xs">{formatDate(transaction.timestamp)}</p>
                  </div>
                  <div className="sm:col-span-1 flex items-center justify-end gap-2">
                    <p
                      className={`text-lg font-bold text-right ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </p>
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                      aria-label={`ลบธุรกรรม ${transaction.id}`}
                      title="ลบธุรกรรม"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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

// คอมโพเนนต์การ์ดแสดงสถิติ
function StatCard({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-lg p-5 shadow-sm border">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${color || 'text-foreground'}`}>{value}</p>
        </div>
        <div className="p-3 bg-muted rounded-full">
          <Icon className={`w-6 h-6 ${color || 'text-muted-foreground'}`} />
        </div>
      </div>
    </div>
  );
}