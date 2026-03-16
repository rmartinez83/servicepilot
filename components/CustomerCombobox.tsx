"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPhoneNumber } from "@/lib/data";
import type { Customer } from "@/lib/models";

function matchCustomer(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  const qDigits = query.replace(/\D/g, "");
  if (!q && !qDigits) return true;
  if (customer.name.toLowerCase().includes(q)) return true;
  if (customer.email && customer.email.toLowerCase().includes(q)) return true;
  if (qDigits.length > 0 && customer.phone && customer.phone.replace(/\D/g, "").includes(qDigits))
    return true;
  return false;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function CustomerCombobox({
  customers,
  value,
  onChange,
  placeholder = "Search by name, phone, or email...",
  id,
}: {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = customers.find((c) => c.id === value);
  const filtered = query.trim()
    ? customers.filter((c) => matchCustomer(c, query))
    : customers;
  const displayValue = open ? query : selected ? selected.name : "";

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlightedIndex(0);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, filtered.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !open) return;
    const item = el.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === "Enter" && filtered[highlightedIndex]) {
      e.preventDefault();
      onChange(filtered[highlightedIndex].id);
      close();
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full overflow-visible">
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="customer-combobox-list"
      />
      {open && (
        <ul
          id="customer-combobox-list"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 min-w-0 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No matching customers</li>
          ) : (
            filtered.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={c.id === value}
                tabIndex={-1}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === highlightedIndex ? "bg-primary/10 text-[var(--dark)]" : "text-[var(--dark)] hover:bg-slate-50"
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(c.id);
                  close();
                }}
              >
                <div className="font-medium">{c.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {formatPhoneNumber(c.phone)}
                  {c.email ? ` · ${c.email}` : ""}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
