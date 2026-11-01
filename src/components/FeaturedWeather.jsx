import { useEffect, useId, useRef, useState } from "react";
import { getCurrentWeatherByCityName, getCurrentWeatherByCoordinates } from "../api/openWeather";

export default function FeaturedWeather({ unit }) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef(null);
  const mountedRef = useRef(false);
  const geoVersionRef = useRef(0);
  const weatherVersionRef = useRef(0);
  const requestRef = useRef(null);
  const busyRef = useRef(false);
  const snapshotRef = useRef(null);
  const [selection, setSelection] = useState(null);
  const [result, setResult] = useState({ status: "idle", data: null });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      geoVersionRef.current += 1;
      weatherVersionRef.current += 1;
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (manualOpen) inputRef.current?.focus();
  }, [manualOpen]);

  useEffect(() => {
    if (!selection) return;
    const version = ++weatherVersionRef.current;
    const previous = snapshotRef.current;
    const controller = new AbortController();
    busyRef.current = true;
    requestRef.current = controller;
    let active = true;

    async function fetchWeather() {
      setResult({ status: "loading", data: null, selection, unit });
      try {
        const data = selection.kind === "coordinates"
          ? await getCurrentWeatherByCoordinates(selection.lat, selection.lon, unit, controller.signal)
          : await getCurrentWeatherByCityName(selection.query, unit, controller.signal);
        if (!active || !mountedRef.current || controller.signal.aborted || version !== weatherVersionRef.current) return;
        if (!Number.isFinite(data?.main?.temp) || !data?.weather?.[0]) throw new Error("Invalid weather response");
        setResult({ status: "success", data, selection, unit });
        const successful = { data, selection, unit, updatedAt: Date.now() };
        snapshotRef.current = successful;
        setSnapshot(successful);
      } catch (error) {
        if (!active || !mountedRef.current || controller.signal.aborted || version !== weatherVersionRef.current) return;
        const message = previous?.selection === selection && previous.unit === unit
          ? "Couldn’t refresh weather. Previous data is still shown."
          : error.response?.status === 404
          ? "City not found. Check the name and try again."
          : "Couldn’t load weather. Check your connection or choose a city manually.";
        // Do not log Axios errors: their request configuration can contain coordinates.
        setResult({ status: "error", data: null, selection, unit, message });
      } finally {
        if (active && mountedRef.current && version === weatherVersionRef.current) busyRef.current = false;
      }
    }
    fetchWeather();
    return () => {
      active = false;
      controller.abort();
      weatherVersionRef.current += 1;
      busyRef.current = false;
    };
  }, [selection, unit, refreshCount]);

  function invalidateWeather() {
    weatherVersionRef.current += 1;
    requestRef.current?.abort();
    busyRef.current = false;
  }

  function refreshWeather() {
    if (busyRef.current || !selection || locating || fetching) return;
    busyRef.current = true;
    setRefreshCount(count => count + 1);
  }

  function openManual() {
    geoVersionRef.current += 1;
    setLocating(false);
    setManualOpen(true);
  }

  function useLocation() {
    const attempt = ++geoVersionRef.current;
    invalidateWeather();
    setSelection(null);
    setLocationError("");
    setManualOpen(false);

    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationError("Location is unavailable in this browser or requires HTTPS. Choose a city manually.");
      setManualOpen(true);
      return;
    }

    setLocating(true);
    const fail = (code) => {
      if (!mountedRef.current || attempt !== geoVersionRef.current) return;
      const messages = {
        1: "Location access was denied. You can choose a city manually.",
        2: "Couldn’t determine your location. Choose a city manually.",
        3: "Finding your location took too long. Choose a city manually.",
      };
      setLocating(false);
      setLocationError(messages[code] || messages[2]);
      setManualOpen(true);
    };
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!mountedRef.current || attempt !== geoVersionRef.current) return;
          if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
            fail(2);
            return;
          }
          setLocating(false);
          // These coordinates exist only in this component's memory.
          setSelection({ kind: "coordinates", lat: coords.latitude, lon: coords.longitude });
        },
        error => fail(error.code),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    } catch {
      fail(2);
    }
  }

  function submitManual(event) {
    event.preventDefault();
    const cityName = query.trim();
    if (!cityName) return;
    geoVersionRef.current += 1;
    invalidateWeather();
    setLocating(false);
    setLocationError("");
    setSelection({ kind: "city", query: cityName });
  }

  const current = result.selection === selection && result.unit === unit;
  const compatible = snapshot?.selection === selection && snapshot?.unit === unit;
  const data = compatible && !locating ? snapshot.data : null;
  const fetching = Boolean(selection) && (!current || result.status === "loading");
  const weatherError = current && result.status === "error" ? result.message : "";
  const temperature = value => Number.isFinite(value)
    ? `${Math.round(value)}${unit === "standard" ? " K" : unit === "imperial" ? "°F" : "°C"}`
    : "—";
  const wind = Number.isFinite(data?.wind?.speed)
    ? `${data.wind.speed} ${unit === "imperial" ? "mph" : "m/s"}` : "—";

  return (
    <section className="featured-weather-panel" aria-labelledby={titleId}>
      <div className="featured-weather-heading">
        <div>
          <p className="featured-weather-eyebrow">YOUR LOCAL WEATHER</p>
          <h2 id={titleId} className="featured-weather-title">{data ? data.name || "Your area" : "Weather near you"}</h2>
          {!data && <p className="featured-weather-intro">Check local conditions or choose a city.</p>}
        </div>
        <div className="featured-weather-actions">
          <button type="button" className="featured-weather-button" onClick={useLocation} disabled={locating}>
            Use my location
          </button>
          <button type="button" className="featured-weather-button featured-weather-button-secondary" onClick={openManual} aria-expanded={manualOpen} aria-controls={`${inputId}-form`}>
            Choose a city manually
          </button>
        </div>
      </div>

      <div className="featured-weather-refresh-toolbar">
        {data && <span className="featured-weather-updated">Last updated: <time dateTime={new Date(snapshot.updatedAt).toISOString()}>{new Date(snapshot.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</time></span>}
        <button type="button" className="featured-weather-refresh-button" onClick={refreshWeather} disabled={!selection || locating || fetching}>
          {fetching && data ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="featured-weather-status" role="status" aria-live="polite" aria-atomic="true">
        {locating ? "Finding your location…" : fetching ? data ? "Refreshing weather…" : "Loading weather…" : data ? `Weather for: ${data.name || "Your area"}.` : ""}
      </p>
      {(locationError || weatherError) && <p className="featured-weather-error" role="alert">{locationError || weatherError}</p>}

      {data && (
        <div className="featured-weather-content">
          <div className="featured-weather-current">
            <div>
              <p className="featured-weather-temperature">{temperature(data.main.temp)}</p>
              <p className="featured-weather-description">{data.weather[0].description}</p>
            </div>
            <img className="featured-weather-icon" src={`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`} alt={data.weather[0].description} width="120" height="120" />
          </div>
          <dl className="featured-weather-metrics">
            <div><dt>Feels like</dt><dd>{temperature(data.main.feels_like)}</dd></div>
            <div><dt>Humidity</dt><dd>{Number.isFinite(data.main.humidity) ? `${data.main.humidity}%` : "—"}</dd></div>
            <div><dt>Wind</dt><dd>{wind}</dd></div>
          </dl>
        </div>
      )}

      <form id={`${inputId}-form`} className="featured-weather-form" onSubmit={submitManual} hidden={!manualOpen}>
        <label className="featured-weather-label" htmlFor={inputId}>City for featured weather</label>
        <div className="featured-weather-field">
          <input ref={inputRef} id={inputId} className="featured-weather-input" type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="City name, e.g. Kraków" required />
          <button type="submit" className="featured-weather-button">Show weather</button>
        </div>
      </form>
    </section>
  );
}
