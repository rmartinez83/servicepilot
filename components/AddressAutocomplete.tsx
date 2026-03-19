"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

function getGooglePlacesApiKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    undefined
  );
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.google?.maps?.places?.Autocomplete) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-places="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script load failed")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    // Required: include libraries=places
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.dataset.googlePlaces = "true";

    script.onload = () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[AddressAutocomplete] Google Maps script loaded", {
          hasGoogle: Boolean(window.google),
          hasPlaces: Boolean(window.google?.maps?.places),
          hasAutocomplete: Boolean(window.google?.maps?.places?.Autocomplete),
        });
      }
      resolve();
    };
    script.onerror = () => {
      if (process.env.NODE_ENV === "development") {
        console.error("[AddressAutocomplete] Google Maps script failed to load");
      }
      reject(new Error("Google Maps Places script failed to load"));
    };

    document.head.appendChild(script);
    if (process.env.NODE_ENV === "development") {
      console.log("[AddressAutocomplete] Loading Google Maps script", script.src);
    }
  });

  return googleScriptPromise;
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
  const apiKey = getGooglePlacesApiKey();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [googleReady, setGoogleReady] = useState(false);

  const inputClassName =
    "h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--dark)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  // Manual entry fallback (no API key configured)
  if (!apiKey) {
    return (
      <div className="w-full">
        <input
          id={id}
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className || inputClassName}
        />
        {process.env.NODE_ENV === "development" && (
          <p className="mt-1 text-xs text-amber-600" role="status">
            Set <code>NEXT_PUBLIC_GOOGLE_PLACES_API_KEY</code> to enable address autocomplete.
          </p>
        )}
      </div>
    );
  }

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (cancelled) return;
        setGoogleReady(true);
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("[AddressAutocomplete] script load error", err);
        }
        if (!cancelled) setGoogleReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!googleReady) return;
    if (!inputRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) {
      if (process.env.NODE_ENV === "development") {
        console.error("[AddressAutocomplete] places library missing or window.google undefined");
      }
      return;
    }

    // Ensure the Google dropdown isn't hidden behind other UI.
    const styleId = "sevora-google-places-zindex";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .pac-container { z-index: 10000 !important; }
      `;
      document.head.appendChild(style);
    }

    if (autocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      // country/region restriction optional; leaving it unset avoids empty results for demos.
      // componentRestrictions: { country: "us" },
      // fields helps reduce payload
      fields: ["place_id", "formatted_address"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace?.();
      if (process.env.NODE_ENV === "development") {
        console.log("[AddressAutocomplete] place_changed", {
          hasGoogle: Boolean(window.google),
          hasPlace: Boolean(place),
          status: place?.place_id ? "has_place_id" : "missing_place_id",
        });
      }

      const formatted = place?.formatted_address;
      const placeId = place?.place_id;
      if (formatted) {
        onChange(formatted);
      } else if (placeId) {
        // Fallback: at least keep the raw input value (Google may still show selected address).
        // We do not block manual typing.
        onChange(inputRef.current?.value ?? value ?? "");
      }
    });

    autocompleteRef.current = ac;
  }, [googleReady, onChange, value]);

  return (
    <div className="relative w-full overflow-visible">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={className || inputClassName}
        aria-autocomplete="list"
      />
    </div>
  );
}
