// src/components/PaginationControls.tsx

'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const limit = searchParams.get('limit') || '10';

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  const handleLimitChange = useCallback((newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit);
    params.set('page', '1'); // Reset to first page when limit changes
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card border rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">รายการต่อหน้า:</span>
        <select
          value={limit}
          onChange={(e) => handleLimitChange(e.target.value)}
          className="px-2 py-1 bg-background border border-input rounded-md text-sm"
        >
          {[5, 10, 20, 50].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        หน้า {currentPage} จาก {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
          title="หน้าแรก"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
          title="หน้าถัดไป"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 