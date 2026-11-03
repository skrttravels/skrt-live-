"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  fetchSuggestions: (q: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder,
  className,
  disabled,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
          setOpen(results.length > 0);
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
      onSelect(item);
      onChange(item);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelect(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [open, suggestions, activeIndex, handleSelect]
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
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim() && suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-11 w-full rounded-lg pr-9 ${className || ""}`}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
        >
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={`${s}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
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
