import { Dashboard } from '@/components/Dashboard';
import { DateFilter } from '@/components/DateFilter';
import { Suspense } from 'react';

export default function BankIncomeDashboardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Suspense fallback={<div>Loading date filter...</div>}>
            <DateFilter />
          </Suspense>
        </div>
        <Suspense fallback={<div>Loading transactions...</div>}>
          <Dashboard searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}