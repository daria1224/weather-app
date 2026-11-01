import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCurrentWeatherByCityName, get5DayForecastByCityName } from "../api/openWeather";
import { useDispatch, useSelector } from "react-redux";
import { toggleFavorite } from "../store/appSlice";

function selectDailyForecast(forecastData, now = Date.now()) {
  // OpenWeather supplies a fixed UTC offset in seconds; use UTC if unavailable.
  const offset = Number.isFinite(forecastData.city?.timezone) ? forecastData.city.timezone : 0;
  const today = new Date(now + offset * 1000).toISOString().slice(0, 10);
  const days = new Map();
  const entries = [...(forecastData.list || [])].sort((a, b) => a.dt - b.dt);

  for (const entry of entries) {
    if (!Number.isFinite(entry.dt)) continue;
    const local = new Date((entry.dt + offset) * 1000);
    const localDate = local.toISOString().slice(0, 10);
    if (localDate <= today) continue;

    const seconds = local.getUTCHours() * 3600 + local.getUTCMinutes() * 60 + local.getUTCSeconds();
    const distance = Math.abs(seconds - 12 * 3600);
    const previous = days.get(localDate);
    // Entries are sorted, so keeping the first on a tie chooses the earlier one.
    if (!previous || distance < previous.distance) {
      days.set(localDate, { distance, entry: { ...entry, localDate } });
    }
  }

  return [...days.values()].slice(0, 5).map(day => day.entry);
}

export default function CityDetails() {
  const { name } = useParams();
  const unit = useSelector(state => state.app.unit);
  const temperatureSuffix = unit === "standard" ? " K" : unit === "imperial" ? "°F" : "°C";
  const windSuffix = unit === "imperial" ? "mph" : "m/s";
  const favorites = useSelector(state => state.app.favorites);
  const dispatch = useDispatch();
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const currentData = await getCurrentWeatherByCityName(name, unit);
        const forecastData = await get5DayForecastByCityName(name, unit);
        setCurrent(currentData);

        const dailyForecast = selectDailyForecast(forecastData);
        setForecast(dailyForecast);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    fetchData();
  }, [name, unit]);

  if (loading) return <div className="city-details-feedback" role="status" aria-live="polite">Loading city details…</div>;
  if (!current) return <div className="city-details-feedback city-details-feedback-error" role="alert">Couldn’t load weather data.</div>;

  const isFav = favorites.includes(current.name);

  return (
    <div className="city-details-page">
      <Link to="/" className="city-details-back">
        ← Back to Home
      </Link>

      <section className="city-details-hero" aria-labelledby="city-details-name">
        <div className="city-details-name-row">
          <h2 id="city-details-name" className="city-details-name">{current.name}</h2>
          <button
            type="button"
            className="city-details-favorite"
            onClick={() => dispatch(toggleFavorite(current.name))}
            aria-label={`${isFav ? "Remove from favorites" : "Add to favorites"}: ${current.name}`}
            aria-pressed={isFav}
          >
            {isFav ? "★" : "☆"}
          </button>
        </div>
        <div className="city-details-current">
          <img
            src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`}
            alt={current.weather[0].description}
            className="city-details-hero-icon"
          />
          <div className="city-details-summary">
            <div className="city-details-temperature">{Math.round(current.main.temp)}{temperatureSuffix}</div>
            <div className="city-details-description">{current.weather[0].description}</div>
          </div>
        </div>

        <dl className="city-details-metrics">
          <div className="city-details-metric">
            <dt>Wind</dt>
            <dd>{current.wind.speed} {windSuffix}</dd>
          </div>
          <div className="city-details-metric">
            <dt>Cloud cover</dt>
            <dd>{current.clouds.all}%</dd>
          </div>
          <div className="city-details-metric">
            <dt>Precipitation</dt>
            <dd>{current.rain ? current.rain["1h"] : 0} mm</dd>
          </div>
        </dl>
      </section>

      <section className="city-details-forecast" aria-labelledby="city-details-forecast-title">
        <h3 id="city-details-forecast-title" className="city-details-forecast-title">5-day forecast</h3>
        <div className="city-details-forecast-grid">
          {forecast.map((f, i) => (
            <div key={i} className="city-details-forecast-card">
              <div className="city-details-forecast-date">{new Date(`${f.localDate}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</div>
              <img
                src={`https://openweathermap.org/img/wn/${f.weather[0].icon}@2x.png`}
                alt={f.weather[0].description}
                className="city-details-forecast-icon"
              />
              <div className="city-details-forecast-temperature">{Math.round(f.main.temp)}{temperatureSuffix}</div>
              <div className="city-details-forecast-description">{f.weather[0].description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
