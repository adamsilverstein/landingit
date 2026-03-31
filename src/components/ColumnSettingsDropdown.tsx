import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_COLUMNS } from '../columns.js';
import '../styles/ColumnSettings.css';

interface ColumnSettingsDropdownProps {
  visibleColumns: string[];
  columnOrder: string[];
  onToggleColumn: (id: string) => void;
  onReorderColumns: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export function ColumnSettingsDropdown({
  visibleColumns,
  columnOrder,
  onToggleColumn,
  onReorderColumns,
  onReset,
}: ColumnSettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const colMap = new Map(DEFAULT_COLUMNS.map((c) => [c.id, c]));
  const orderedColumns = columnOrder.map((id) => colMap.get(id)!).filter(Boolean);

  return (
    <div className="col-settings-wrapper" ref={wrapperRef}>
      <button
        className="col-settings-btn"
        onClick={() => setOpen((prev) => !prev)}
        title="Column settings"
        aria-label="Column settings"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492ZM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0Z" />
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319Zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318Z" />
        </svg>
      </button>
      {open && (
        <div className="col-settings-dropdown" role="listbox" aria-label="Column visibility and order">
          <div className="col-settings-header">Columns</div>
          {orderedColumns.map((col, index) => (
            <div
              key={col.id}
              className={`col-settings-item ${dragOverIndex === index ? 'col-settings-drag-over' : ''}`}
              role="option"
              aria-selected={visibleColumns.includes(col.id)}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) {
                  onReorderColumns(dragIndex, index);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
            >
              <span className="col-settings-drag-handle" aria-hidden="true">
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                  <circle cx="3" cy="2" r="1.2" />
                  <circle cx="7" cy="2" r="1.2" />
                  <circle cx="3" cy="7" r="1.2" />
                  <circle cx="7" cy="7" r="1.2" />
                  <circle cx="3" cy="12" r="1.2" />
                  <circle cx="7" cy="12" r="1.2" />
                </svg>
              </span>
              <div className="col-settings-reorder">
                <button
                  className="col-settings-move-btn"
                  onClick={() => onReorderColumns(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${col.label} up`}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  className="col-settings-move-btn"
                  onClick={() => onReorderColumns(index, index + 1)}
                  disabled={index === orderedColumns.length - 1}
                  aria-label={`Move ${col.label} down`}
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <label className="col-settings-label">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.id)}
                  onChange={() => onToggleColumn(col.id)}
                  disabled={visibleColumns.length === 1 && visibleColumns.includes(col.id)}
                />
                {col.label}
              </label>
            </div>
          ))}
          <button className="col-settings-reset" onClick={onReset}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
