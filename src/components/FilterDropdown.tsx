import React, { useState, useEffect, useRef } from 'react';

export interface FilterDropdownOption<K extends string> {
  key: K;
  label: string;
  color?: string;
}

interface FilterDropdownProps<K extends string> {
  categoryLabel: string;
  options: FilterDropdownOption<K>[];
  value?: K;
  values?: Set<K>;
  onSelect?: (key: K) => void;
  onToggle?: (key: K) => void;
  renderTriggerLabel?: () => string;
}

export function FilterDropdown<K extends string>({
  categoryLabel,
  options,
  value,
  values,
  onSelect,
  onToggle,
  renderTriggerLabel,
}: FilterDropdownProps<K>) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isMulti = values !== undefined && onToggle !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const triggerLabel = renderTriggerLabel
    ? renderTriggerLabel()
    : isMulti
      ? options.filter((o) => values!.has(o.key)).map((o) => o.label).join(', ') || 'None'
      : options.find((o) => o.key === value)?.label ?? '';

  const handleOptionClick = (key: K) => {
    if (isMulti) {
      onToggle!(key);
    } else {
      onSelect?.(key);
      setIsOpen(false);
    }
  };

  const isActive = (key: K) => isMulti ? values!.has(key) : value === key;

  return (
    <div className="filter-dropdown" ref={wrapperRef}>
      <button
        className={`filter-dropdown-trigger ${isOpen ? 'filter-dropdown-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="filter-dropdown-category">{categoryLabel}:</span>
        <span className="filter-dropdown-value">{triggerLabel}</span>
        <span className={`filter-dropdown-chevron ${isOpen ? 'filter-dropdown-chevron-up' : ''}`}>&#9662;</span>
      </button>
      {isOpen && (
        <div className="filter-dropdown-panel" role="listbox" aria-label={categoryLabel}>
          {options.map((option) => {
            const active = isActive(option.key);
            return (
              <button
                key={option.key}
                className={`filter-dropdown-option ${active ? 'filter-dropdown-option-active' : ''}`}
                onClick={() => handleOptionClick(option.key)}
                role="option"
                aria-selected={active}
              >
                <span className="filter-dropdown-check">{active ? '✓' : ''}</span>
                {option.color && (
                  <span
                    className="filter-dropdown-dot"
                    style={{ background: option.color }}
                  />
                )}
                <span className="filter-dropdown-option-label">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
