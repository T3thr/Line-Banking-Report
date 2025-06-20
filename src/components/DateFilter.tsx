'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateValue = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);
      return params.toString();
    },
    [searchParams]
  );

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    router.push(`/?${createQueryString('date', event.target.value)}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="date-filter" className="text-sm font-medium">
        ดูข้อมูลวันที่:
      </label>
      <input
        type="date"
        id="date-filter"
        value={dateValue}
        onChange={handleDateChange}
        className="px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
} 