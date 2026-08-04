import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { PAGE_SIZE_OPTIONS } from "../hooks/useTablePager";

type Props = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <div className="table-pagination">
      <label className="table-pagination-left">
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Rows per page"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 12 }}>
          {total === 0 ? "0 rows" : `${total} total`}
        </span>
      </label>
      <div className="table-pagination-right">
        <button
          type="button"
          className="btn secondary icon-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <span style={{ fontSize: 13, minWidth: 64, textAlign: "center" }}>
          {total === 0 ? "0 of 0" : `${page} of ${totalPages}`}
        </span>
        <button
          type="button"
          className="btn secondary icon-btn"
          disabled={page >= totalPages || total === 0}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
