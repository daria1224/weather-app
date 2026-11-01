import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CityCard from "../components/CityCard";
import CityAutocomplete from "../components/CityAutocomplete";
import FeaturedWeather from "../components/FeaturedWeather";
import { getCurrentWeatherByCityName } from "../api/openWeather";
import { useSelector } from "react-redux";

const defaultCities = [
  "Warsaw",
  "London",
  "Paris",
  "New York",
  "Barcelona",
  "Rome",
  "Amsterdam",
  "Lisbon",
  "Oslo",
  "Copenhagen"
];

export default function Home() {
  const unit = useSelector(state => state.app.unit);
  const navigate = useNavigate();
  const submissionRef = useRef(0);
  const dashboardRequestRef = useRef(0);
  const dashboardControllerRef = useRef(null);
  const dashboardBusyRef = useRef(false);
  const snapshotRef = useRef(null);

  const [cities, setCities] = useState(() => {
    try {
      const storedCities = JSON.parse(localStorage.getItem("cities"));
      return Array.isArray(storedCities) && storedCities.every(city => typeof city === "string" && city.trim())
        ? storedCities
        : defaultCities;
    } catch {
      return defaultCities;
    }
  });
  // Updated together with state in handlers so rapid actions use the latest list.
  const citiesRef = useRef(cities);

  const [citiesData, setCitiesData] = useState([]);
  const [weatherUnit, setWeatherUnit] = useState(unit);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [removalMessage, setRemovalMessage] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    // Ignore pending submissions after leaving Home or changing units.
    return () => { submissionRef.current += 1; };
  }, [unit]);

  useEffect(() => {
    const request = ++dashboardRequestRef.current;
    const controller = new AbortController();
    dashboardControllerRef.current = controller;
    dashboardBusyRef.current = true;
    const cityKey = JSON.stringify(cities);
    let disposed = false;
    const isCurrent = () => !disposed && request === dashboardRequestRef.current;

    async function fetchCities() {
      setLoading(true);
      setDashboardError("");
      if (!cities.length) {
        snapshotRef.current = null;
        setLastUpdate(null);
        setCitiesData([]);
        setWeatherUnit(unit);
        setLoading(false);
        dashboardBusyRef.current = false;
        return;
      }
      const data = [];
      let failed = false;
      for (let city of cities) {
        if (!isCurrent()) return;
        try {
          const res = await getCurrentWeatherByCityName(city, unit, controller.signal);
          if (!isCurrent()) return;
          // Keep the saved query separate from the API's normalized display name.
          if (!Number.isFinite(res?.main?.temp) || !res?.weather?.[0]) throw new Error("Invalid weather response");
          data.push({ sourceName: city, weather: res });
        } catch {
          if (!isCurrent()) return;
          failed = true;
        }
      }
      if (!isCurrent()) return;
      const previous = snapshotRef.current;
      const compatible = previous?.unit === unit && previous.cityKey === cityKey;
      if (!failed || !compatible) {
        const updatedAt = failed ? null : Date.now();
        snapshotRef.current = { data, unit, cityKey, updatedAt };
        setCitiesData(data);
        setLastUpdate(updatedAt ? { time: updatedAt, unit, cityKey } : null);
      }
      if (failed) {
        setDashboardError(compatible
          ? "Couldn’t refresh all cities. Previous data is still shown."
          : "Couldn’t load every city. A complete update was not available.");
      }
      setWeatherUnit(unit);
      setLoading(false);
      dashboardBusyRef.current = false;
    }
    fetchCities();
    return () => {
      disposed = true;
      controller.abort();
      if (request === dashboardRequestRef.current) dashboardBusyRef.current = false;
    };
  }, [cities, unit, refreshCount]);

  const handleRefreshCities = () => {
    if (dashboardBusyRef.current || loading || !citiesRef.current.length || weatherUnit !== unit) return;
    dashboardBusyRef.current = true;
    setRefreshCount(count => count + 1);
  };

  const handleRemoveCity = (sourceName, displayName) => {
    const current = citiesRef.current;
    if (!current.includes(sourceName)) return;
    const updated = current.filter(city => city !== sourceName);

    try {
      // Do not change the dashboard unless the same change can be persisted.
      localStorage.setItem("cities", JSON.stringify(updated));
    } catch {
      setError("Couldn’t save the removal. Please try again.");
      return;
    }

    submissionRef.current += 1;
    dashboardRequestRef.current += 1;
    dashboardControllerRef.current?.abort();
    citiesRef.current = updated;
    setCities(updated);
    setCitiesData(prev => prev.filter(entry => entry.sourceName !== sourceName));
    if (snapshotRef.current) {
      snapshotRef.current = {
        ...snapshotRef.current,
        data: snapshotRef.current.data.filter(entry => entry.sourceName !== sourceName),
        cityKey: JSON.stringify(updated),
        updatedAt: null,
      };
    }
    setLastUpdate(null);
    setError(null);
    setRemovalMessage(`Removed city: ${displayName}.`);
    if (!updated.length) document.getElementById("home-city-search")?.focus();
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    const submission = ++submissionRef.current;
    const cityName = search.trim();
    if (!cityName) return;

    const cityNameLower = cityName.toLowerCase();
    const existingCity = citiesRef.current.find(
      city => city.toLowerCase() === cityNameLower
    );

    try {
      const res = await getCurrentWeatherByCityName(cityName, unit);
      if (submission !== submissionRef.current) return;
      if (res) {
        if (!existingCity) {
          const updated = [...citiesRef.current, cityName];
          // Persist before navigation can unmount Home; keep the state update pure.
          localStorage.setItem("cities", JSON.stringify(updated));
          citiesRef.current = updated;
          setCities(updated);
        }
        setSearch("");
        setError(null);
        navigate(`/city/${encodeURIComponent(existingCity || res.name || cityName)}`);
      } else {
        setError("City not found or weather service unavailable.");
      }
    } catch (err) {
      if (submission !== submissionRef.current) return;
      console.error("City search failed:", err);
      setError("City not found or weather service unavailable.");
    }
  };

  return (
    <div className="home-page">
      <div className="home-intro">
        <p className="home-eyebrow">EVERYDAY WEATHER</p>
        <h2 className="home-title">Weather in your cities.</h2>
        <p className="home-description">Find a city and plan your day.</p>
      </div>

      <form onSubmit={handleAddCity} className="home-search">
        <label htmlFor="home-city-search" className="home-search-label">
          City name
        </label>
        <CityAutocomplete
          id="home-city-search"
          value={search}
          onChange={(value) => {
            submissionRef.current += 1;
            setSearch(value);
          }}
        />
        <button type="submit" className="home-search-button">
          Add
        </button>
      </form>

      {error && <div className="home-error" role="alert">{error}</div>}
      <p className="home-search-label" role="status" aria-live="polite" aria-atomic="true">
        {removalMessage}
      </p>

      <FeaturedWeather unit={unit} />

      <section className="home-cities" aria-labelledby="home-cities-title">
        <div className="home-refresh-toolbar">
          <h2 id="home-cities-title" className="home-section-title">Weather in your cities</h2>
          <div className="home-refresh-actions">
            {lastUpdate && lastUpdate.unit === unit && lastUpdate.cityKey === JSON.stringify(cities) && cities.length > 0 && (
              <span className="home-updated">Last complete update: <time dateTime={new Date(lastUpdate.time).toISOString()}>{new Date(lastUpdate.time).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</time></span>
            )}
            <button type="button" className="home-refresh-button" onClick={handleRefreshCities} disabled={loading || !cities.length || weatherUnit !== unit}>
              {loading && cities.length > 0 ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <p className="home-refresh-status" role="status" aria-live="polite">{loading && citiesData.length > 0 && weatherUnit === unit ? "Refreshing city weather…" : ""}</p>
        {dashboardError && <p className="home-refresh-error" role="status">{dashboardError}</p>}
        {cities.length > 0 && (weatherUnit !== unit || (loading && !citiesData.length)) ? (
          <div role="status">Loading weather…</div>
        ) : cities.length === 0 ? (
          <div className="home-empty">
            <h3>No cities yet.</h3>
            <p>Search above to add a city.</p>
          </div>
        ) : (
          <div className="grid home-city-grid">
            {citiesData.map(({ sourceName, weather }) => (
              <CityCard
                key={sourceName}
                city={weather}
                onRemove={() => handleRemoveCity(sourceName, weather.name)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
