import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  colorTheme?: 'blue' | 'teal' | 'indigo' | 'violet' | 'emerald';
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  colorTheme = 'blue',
}) => {
  if (totalPages <= 1) return null;

  const colorClasses = {
    blue: {
      active: 'bg-blue-600 text-white border-blue-600',
      text: 'text-blue-600 hover:bg-blue-50 border-slate-200',
    },
    teal: {
      active: 'bg-teal-600 text-white border-teal-600',
      text: 'text-teal-600 hover:bg-teal-50 border-slate-200',
    },
    indigo: {
      active: 'bg-indigo-600 text-white border-indigo-600',
      text: 'text-indigo-600 hover:bg-indigo-50 border-slate-200',
    },
    violet: {
      active: 'bg-violet-600 text-white border-violet-600',
      text: 'text-violet-600 hover:bg-violet-50 border-slate-200',
    },
    emerald: {
      active: 'bg-emerald-600 text-white border-emerald-600',
      text: 'text-emerald-600 hover:bg-emerald-50 border-slate-200',
    },
  };

  const activeTheme = colorClasses[colorTheme] || colorClasses.blue;

  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center bg-[#f1f3f7] border-t border-slate-300 px-4 py-2 gap-2 text-xs select-none">
      <div className="text-slate-500 font-medium">
        Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-bold transition-all outline-none"
          title="First Page"
        >
          &lt;&lt;
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-bold transition-all outline-none"
          title="Previous Page"
        >
          &lt;
        </button>

        {pages[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1 border rounded font-bold transition-all bg-white text-slate-600 border-slate-200 hover:bg-slate-50 outline-none"
            >
              1
            </button>
            {pages[0] > 2 && <span className="px-1 text-slate-400">...</span>}
          </>
        )}

        {pages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`px-3 py-1 border rounded font-bold transition-all outline-none ${
              currentPage === pageNum
                ? activeTheme.active
                : `bg-white ${activeTheme.text}`
            }`}
          >
            {pageNum}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1 border rounded font-bold transition-all bg-white text-slate-600 border-slate-200 hover:bg-slate-50 outline-none"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-bold transition-all outline-none"
          title="Next Page"
        >
          &gt;
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-bold transition-all outline-none"
          title="Last Page"
        >
          &gt;&gt;
        </button>
      </div>
    </div>
  );
};
