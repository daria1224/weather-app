import { useEffect, useId, useRef, useState } from "react";
import { getCitySuggestions } from "../api/openWeather";

const countryNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en-GB"], { type: "region" })
  : null;

function countryLabel(code) {
  try { return countryNames?.of(code) || code; }
  catch { return code; }
}

export default function CityAutocomplete({ id, value, onChange }) {
  const listId = useId();
  const statusId = useId();
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const timerRef = useRef(null);
  const versionRef = useRef(0);
  const selectedRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState({ query: "", status: "idle", items: [] });
  const query = value.trim();
  const current = result.query === query;
  const items = current ? result.items : [];
  const visible = open && query.length >= 2 && current && result.status !== "idle";

  function invalidate() {
    versionRef.current += 1;
    clearTimeout(timerRef.current);
    requestRef.current?.abort();
  }

  function dismiss() {
    invalidate();
    setOpen(false);
    setActive(-1);
  }

  function choose(city) {
    dismiss();
    selectedRef.current = city.name;
    onChange(city.name);
    inputRef.current?.focus();
  }

  useEffect(() => {
    const version = ++versionRef.current;
    if (!open || query.length < 2 || selectedRef.current === value) return;

    const controller = new AbortController();
    requestRef.current = controller;
    timerRef.current = setTimeout(async () => {
      if (version !== versionRef.current) return;
      setActive(-1);
      setResult({ query, status: "loading", items: [] });
      try {
        const data = await getCitySuggestions(query, controller.signal);
        if (controller.signal.aborted || version !== versionRef.current) return;
        if (!Array.isArray(data)) throw new Error("Invalid geocoding response");
        const unique = new Map();
        for (const city of data) {
          if (typeof city.name !== "string" || !city.name.trim() ||
              typeof city.country !== "string" || !Number.isFinite(city.lat) ||
              !Number.isFinite(city.lon)) continue;
          const key = `${city.lat},${city.lon}`;
          if (!unique.has(key)) unique.set(key, city);
        }
        setResult({ query, status: "success", items: [...unique.values()].slice(0, 3) });
      } catch {
        // Aborted/stale requests are not user-facing errors; never log Axios credentials.
        if (controller.signal.aborted || version !== versionRef.current) return;
        setResult({ query, status: "error", items: [] });
      }
    }, 400);

    return () => {
      clearTimeout(timerRef.current);
      controller.abort();
      versionRef.current += 1;
    };
  }, [query, value, open]);

  useEffect(() => {
    if (visible && active >= 0) {
      document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [active, visible, listId]);

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      if (open) event.preventDefault();
      dismiss();
    } else if (event.key === "Tab") {
      dismiss();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (query.length < 2 || selectedRef.current === value) return;
      event.preventDefault();
      setOpen(true);
      if (items.length) {
        setActive(index => event.key === "ArrowDown"
          ? (index + 1) % items.length
          : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length));
      }
    } else if (event.key === "Enter" && visible && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Enter") {
      // No highlighted suggestion: keep the original form submission behavior.
      dismiss();
    }
  }

  let message = "";
  if (visible) {
    if (result.status === "loading") message = "Searching for cities…";
    else if (result.status === "error") message = "Couldn’t load suggestions. You can still enter a city manually.";
    else if (!items.length) message = "No matching cities found.";
    else message = `${items.length} suggestions available. Use the arrow keys to choose a city.`;
  }

  return (
    <div className="city-autocomplete" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
    }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(event) => {
          invalidate();
          selectedRef.current = null;
          setActive(-1);
          setResult({ query: event.target.value.trim(), status: "idle", items: [] });
          setOpen(true);
          onChange(event.target.value);
        }}
        onFocus={() => { if (selectedRef.current !== value) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Search for a city"
        className="home-search-input"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-describedby={statusId}
        aria-activedescendant={visible && active >= 0 && items[active] ? `${listId}-${active}` : undefined}
      />
      <span id={statusId} className="home-search-label" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </span>
      <div className="city-autocomplete-popup" hidden={!visible}>
        <ul id={listId} className="city-autocomplete-list" role="listbox" aria-label="City suggestions" aria-busy={result.status === "loading"}>
          {items.map((city, index) => (
            <li
              key={`${city.lat},${city.lon}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={active === index}
              className="city-autocomplete-option"
              onPointerDown={(event) => {
                // Keep input focus until click; works for mouse, pen and touch taps.
                if (event.button === 0) event.preventDefault();
              }}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(city)}
            >
              <span className="city-autocomplete-name">{city.name}</span>
              <span className="city-autocomplete-region">
                {[city.state, countryLabel(city.country)].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
        {message && !items.length && <p className="city-autocomplete-message">{message}</p>}
      </div>
    </div>
  );
}
