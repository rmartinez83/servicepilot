"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;

function getMapboxToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
}

type MapboxFeature = {
  id: string;
  place_name: string;
  place_type?: string[];
};

type MapboxGeocodeResponse = {
  features?: MapboxFeature[];
  message?: string;
};

async function fetchSuggestions(query: string, token: string): Promise<string[]> {
  if (!query.trim()) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${token}&limit=5&types=address,place`;
  if (process.env.NODE_ENV === "development") {
    console.log("[AddressAutocomplete] fetch query:", query.trim(), "| response below");
  }
  const res = await fetch(url);
  const data = (await res.json()) as MapboxGeocodeResponse & { features?: MapboxFeature[] };
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AddressAutocomplete] API error:", res.status, data);
    }
    return [];
  }
  const features = data.features ?? [];
  if (process.env.NODE_ENV === "development") {
    console.log("[AddressAutocomplete] API response length:", features.length);
  }
  return features.map((f) => f.place_name);
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Street, city, state, zip",
  className = "",
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const token = getMapboxToken();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback((q: string, t: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    fetchSuggestions(q, t)
      .then((list) => {
        setSuggestions(list);
        setOpen(list.length > 0);
        if (process.env.NODE_ENV === "development") {
          console.log("[AddressAutocomplete] suggestions:", list.length, list.slice(0, 2));
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AddressAutocomplete] fetch error:", err);
        }
        setSuggestions([]);
        setOpen(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value, token), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, token, runSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inputClassName =
    "h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  if (!token) {
    if (process.env.NODE_ENV === "development") {
      console.log("[AddressAutocomplete] Mapbox token missing - using plain input");
    }
    return (
      <div className="w-full">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className || inputClassName}
        />
        {process.env.NODE_ENV === "development" && (
          <p className="mt-1 text-xs text-amber-600" role="status">
            Mapbox token missing — address autocomplete disabled
          </p>
        )}
      </div>
    );
  }

  const debugMessage =
    process.env.NODE_ENV === "development"
      ? loading
        ? "Loading suggestions..."
        : open && suggestions.length === 0
          ? "No results"
          : null
      : null;

  return (
    <div ref={wrapperRef} className="relative w-full overflow-visible">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className || inputClassName}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="address-suggestions"
      />
      {open && (suggestions.length > 0 || loading) && (
        <ul
          id="address-suggestions"
          className="absolute left-0 right-0 top-full z-[100] mt-1 min-w-0 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-slate-500">Searching...</li>
          ) : (
            suggestions.map((s) => (
              <li
                key={s}
                role="option"
                tabIndex={0}
                className="cursor-pointer px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                  setOpen(false);
                  setSuggestions([]);
                  if (process.env.NODE_ENV === "development") {
                    console.log("[AddressAutocomplete] selected:", s);
                  }
                }}
              >
                {s}
              </li>
            ))
          )}
        </ul>
      )}
      {debugMessage && (
        <p className="mt-1 text-xs text-slate-500" role="status">
          {debugMessage}
        </p>
      )}
    </div>
  );
}
