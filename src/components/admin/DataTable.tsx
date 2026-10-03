import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './SkeletonLoader';

export interface Column<T> {
  key?: string;
  accessorKey?: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  keyField?: string;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearch?: (val: string) => void;
  page?: number;
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  serverSidePagination?: boolean;
  onPageChange?: (newPage: number) => void;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (sortKey: string) => void;
  onRowClick?: (row: T) => void;
  selectedIds?: string[];
  selectedRowKeys?: string[];
  onSelectToggle?: (id: string) => void;
  onSelectRows?: (keys: string[]) => void;
  selectable?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  keyField,
  isLoading = false,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  onSearch,
  page,
  currentPage,
  totalPages = 1,
  totalRecords,
  onPageChange,
  sortBy,
  sortDir = 'desc',
  onSortChange,
  onRowClick,
  selectedIds,
  selectedRowKeys,
  onSelectToggle,
  onSelectRows,
  selectable = false,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no records matching your current criteria.',
}: DataTableProps<T>) {
  const activePage = currentPage !== undefined ? currentPage : page !== undefined ? page : 1;
  const [internalSearch, setInternalSearch] = useState('');
  const currentSearch = searchValue !== undefined ? searchValue : internalSearch;

  const handleSearch = (val: string) => {
    setInternalSearch(val);
    if (onSearchChange) onSearchChange(val);
    if (onSearch) onSearch(val);
  };

  const getRowKey = (row: T, index: number): string => {
    if (keyExtractor) return keyExtractor(row);
    if (keyField && (row as any)[keyField] !== undefined) return String((row as any)[keyField]);
    return String(index);
  };

  const activeSelected = selectedRowKeys || selectedIds || [];

  const handleToggleRow = (key: string) => {
    if (onSelectToggle) {
      onSelectToggle(key);
    }
    if (onSelectRows) {
      if (activeSelected.includes(key)) {
        onSelectRows(activeSelected.filter(k => k !== key));
      } else {
        onSelectRows([...activeSelected, key]);
      }
    }
  };

  const handleToggleAll = () => {
    if (!onSelectRows) return;
    const allKeys = data.map((r, i) => getRowKey(r, i));
    if (activeSelected.length === data.length) {
      onSelectRows([]);
    } else {
      onSelectRows(allKeys);
    }
  };

  const hasSearch = onSearchChange !== undefined || onSearch !== undefined;
  const isSelectable = selectable || onSelectToggle !== undefined || onSelectRows !== undefined;

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      {hasSearch && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={currentSearch}
              onChange={e => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-100 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow font-sans"
            />
          </div>

          {totalRecords !== undefined && (
            <div className="text-xs font-mono text-slate-400 self-end sm:self-auto">
              Total: <span className="text-white font-bold">{totalRecords}</span> records
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl bg-[#0b0d14] border border-white/10 shadow-xl">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={columns.length} />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-mono uppercase text-[11px]">
                {isSelectable && (
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && activeSelected.length === data.length}
                      onChange={handleToggleAll}
                      className="rounded border-white/20 text-brand-yellow focus:ring-brand-yellow focus:ring-offset-0 bg-surface-100 cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((col, cIdx) => {
                  const colKey = col.key || col.accessorKey || String(cIdx);
                  return (
                    <th
                      key={colKey}
                      onClick={() => col.sortable && onSortChange && onSortChange(colKey)}
                      className={`py-3.5 px-4 tracking-wider ${col.sortable ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && sortBy === colKey && (
                          <span className="text-brand-yellow font-mono text-[10px]">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row, idx) => {
                const key = getRowKey(row, idx);
                const isSelected = activeSelected.includes(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-white/[0.03] transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${isSelected ? 'bg-brand-yellow/[0.04]' : ''}`}
                  >
                    {isSelectable && (
                      <td className="py-3 px-4 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(key)}
                          className="rounded border-white/20 text-brand-yellow focus:ring-brand-yellow focus:ring-offset-0 bg-surface-100 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col, cIdx) => {
                      const colKey = col.key || col.accessorKey || String(cIdx);
                      const content = col.render
                        ? col.render(row, idx)
                        : col.cell
                        ? col.cell(row, idx)
                        : (row as any)[colKey];

                      return (
                        <td key={colKey} className="py-3 px-4 text-slate-300">
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs font-mono text-slate-400">
            Page <span className="text-white font-bold">{activePage}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
