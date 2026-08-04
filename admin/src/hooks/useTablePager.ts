import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 20, 30, 50] as const;

export function useTablePager<T>(rows: T[], defaultSize = 10) {
  const [pageSize, setPageSize] = useState(defaultSize);
  const [page, setPage] = useState(1);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [pageSize, total]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
  };
}
