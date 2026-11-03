"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface TableCellAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  fetchSuggestions: (q: string) => Promise<string[]>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  "data-row"?: number;
  "data-col"?: number;
  className?: string;
  placeholder?: string;
}

export function TableCellAutocomplete({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  onKeyDown,
  "data-row": dataRow,
  "data-col": dataCol,
  className = "",
  placeholder,
}: TableCellAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const suppressNextOpenRef = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchSuggestions(q);
        if (!cancelled) {
          setSuggestions(results);
          const shouldOpen = !suppressNextOpenRef.current && results.length > 0;
          setOpen(shouldOpen);
          if (suppressNextOpenRef.current) {
            suppressNextOpenRef.current = false;
          }
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (item: string) => {
      suppressNextOpenRef.current = true;
      onSelect(item);
      onChange(item);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [onSelect, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (open && suggestions.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            e.stopPropagation();
            setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
            return;
          case "ArrowUp":
            e.preventDefault();
            e.stopPropagation();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
            return;
          case "Enter":
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(suggestions[activeIndex]);
              return;
            }
            break;
          case "Escape":
            setOpen(false);
            setActiveIndex(-1);
            break;
        }
      }
      onKeyDown?.(e);
    },
    [open, suggestions, activeIndex, handleSelect, onKeyDown]
  );

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim() && suggestions.length > 0) setOpen(true);
        }}
        data-row={dataRow}
        data-col={dataCol}
        placeholder={placeholder}
        className={`bg-transparent border-0 text-white outline-none focus:bg-[#2388ff]/10 ${className}`}
      />
      {loading && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-50">
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 left-0 min-w-full max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={`${s}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                i === activeIndex
                  ? "bg-slate-700 text-white"
                  : "text-white hover:bg-slate-800/70"
              }`}
            >
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
