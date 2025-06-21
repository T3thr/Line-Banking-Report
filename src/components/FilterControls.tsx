// src/components/FilterControls.tsx

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar as CalendarIcon, SlidersHorizontal, RefreshCw } from 'lucide-react';

export function FilterControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterType, setFilterType] = useState(searchParams.get('filterType') || 'monthly');
  
  const today = new Date();
  const [date, setDate] = useState(searchParams.get('date') || today.toISOString().split('T')[0]);
  const [month, setMonth] = useState(searchParams.get('month') || (today.getMonth() + 1).toString());
  const [year, setYear] = useState(searchParams.get('year') || today.getFullYear().toString());

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleApplyFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('filterType', filterType);
    params.set('page', '1'); // Reset to first page on new filter

    if (filterType === 'daily') {
      params.set('date', date);
      params.delete('month');
      params.delete('year');
    } else if (filterType === 'monthly') {
      params.set('month', month);
      params.set('year', year);
      params.delete('date');
    } else { // 'all'
      params.delete('date');
      params.delete('month');
      params.delete('year');
    }
    
    router.push(`/?${params.toString()}`);
  }, [router, searchParams, filterType, date, month, year]);

  const handleResetToCurrentMonth = () => {
    // Clear selection and URL path dynamically
    setFilterType('monthly');
    setDate(today.toISOString().split('T')[0]);
    setMonth((today.getMonth() + 1).toString());
    setYear(today.getFullYear().toString());
    router.push('/'); // Clear query and go back to root
  };

  const years = Array.from({ length: 10 }, (_, i) => today.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('th-TH', { month: 'long' }) }));

  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">ตัวกรองข้อมูล</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        {/* Filter Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">รูปแบบ</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md">
            <option value="monthly">รายเดือน</option>
            <option value="daily">รายวัน</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {/* Dynamic Filters */}
        {filterType === 'daily' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">เลือกวัน</label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md pr-10" // pr-10 for icon space
                style={{
                  // Hide default calendar icon (for Chrome, Edge, Safari)
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0 m-0 bg-transparent border-none cursor-pointer"
                onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                aria-label="เลือกวัน"
              >
                <CalendarIcon className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        )}
        {filterType === 'monthly' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">เดือน</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md">
                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ปี</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 bg-background border border-input rounded-md">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:col-start-4">
          <button onClick={handleApplyFilter} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            แสดงข้อมูล
          </button>
          <button onClick={handleResetToCurrentMonth} title="รีเซ็ตตัวกรอง" className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors cursor-pointer">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}