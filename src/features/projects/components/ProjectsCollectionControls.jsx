import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronDown } from 'lucide-react';

export function SortHeading({ label, ascending, descending, sort, onSort }) {
  const direction = sort === ascending ? 'ascending' : sort === descending ? 'descending' : 'none';
  const Icon = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowDownUp;
  return <button type="button" className="projects-table__sort" aria-label={`Sort by ${label}`} onClick={() => onSort(direction === 'ascending' ? descending : ascending)}>
    {label}<Icon size={13} aria-hidden="true" />
  </button>;
}

export function ProjectFilterSelect({ label, value, options, onChange }) {
  const id = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex(([optionValue]) => optionValue === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!open) return undefined;
    optionRefs.current[activeIndex]?.focus();
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [activeIndex, open]);

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };
  const choose = (optionValue) => {
    onChange(optionValue);
    close(true);
  };
  const moveFocus = (index) => {
    const next = Math.max(0, Math.min(options.length - 1, index));
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] || options[0][1];

  return <div className="projects-filter-select" ref={rootRef}>
    <span className="projects-filter-label" id={`${id}-label`}>{label}</span>
    <button ref={buttonRef} type="button" className="projects-filter-select__trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-options`} aria-haspopup="listbox" onClick={() => { setActiveIndex(selectedIndex); setOpen((current) => !current); }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
    }}>
      <span id={`${id}-value`}>{selectedLabel}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} className="projects-filter-select__options" role="listbox" aria-labelledby={`${id}-label`} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(activeIndex + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(activeIndex - 1); }
      else if (event.key === 'Home') { event.preventDefault(); moveFocus(0); }
      else if (event.key === 'End') { event.preventDefault(); moveFocus(options.length - 1); }
      else if (event.key === 'Tab') close();
    }}>{options.map(([optionValue, optionLabel], index) => <button ref={(element) => { optionRefs.current[index] = element; }} key={optionValue} type="button" role="option" aria-selected={value === optionValue} tabIndex={activeIndex === index ? 0 : -1} onClick={() => choose(optionValue)}>{optionLabel}</button>)}</div>}
  </div>;
}
