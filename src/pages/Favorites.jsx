import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import CityCard from "../components/CityCard";
import { getCurrentWeatherByCityName } from "../api/openWeather";
import { Link } from "react-router-dom";

export default function Favorites() {
  const favorites = useSelector(state => state.app.favorites);
  const unit = useSelector(state => state.app.unit);
  const [citiesData, setCitiesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavorites() {
      setLoading(true);
      const data = [];
      for (let city of favorites) {
        try {
          const res = await getCurrentWeatherByCityName(city, unit);
          data.push(res);
        } catch (err) {
          console.error("Couldn’t load weather for city:", city, err);
        }
      }
      setCitiesData(data);
      setLoading(false);
    }

    // An empty list completes the same flow, without making any API requests.
    fetchFavorites();
  }, [favorites, unit]);

  if (loading) return <div className="favorites-feedback" role="status" aria-live="polite">Loading favorites…</div>;
  if (favorites.length === 0)
    return (
      <div className="favorites-page">
        <div className="favorites-intro">
          <h2 className="favorites-title">Favorite cities</h2>
          <p className="favorites-description">Weather in places you love returning to.</p>
        </div>
        <div className="favorites-empty">
          <p className="favorites-empty-title">No favorite cities yet.</p>
          <p className="favorites-empty-description">Select the star on a city card to save it here.</p>
          <Link to="/" className="favorites-back">
            ← Back to Home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="favorites-page">
      <div className="favorites-intro">
        <h2 className="favorites-title">Favorite cities</h2>
        <p className="favorites-description">Weather in places you love returning to.</p>
      </div>
      <div className="favorites-grid">
        {citiesData.map(city => (
          <CityCard key={city.id} city={city} />
        ))}
      </div>
      <Link to="/" className="favorites-back">
        ← Back to Home
      </Link>
    </div>
  );
}
