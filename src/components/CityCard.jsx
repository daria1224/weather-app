import { useDispatch, useSelector } from "react-redux";
import { toggleFavorite } from "../store/appSlice";
import { Link } from "react-router-dom";

export default function CityCard({ city, onRemove }) {
  const dispatch = useDispatch();
  const favorites = useSelector(state => state.app.favorites);
  const unit = useSelector(state => state.app.unit);
  const temperatureSuffix = unit === "standard" ? " K" : unit === "imperial" ? "°F" : "°C";
  const isFav = favorites.includes(city.name);

  return (
    <div className="city-card city-card--summary">
      <div className="city-card-heading">
        <h3 className="city-card-name">{city.name}</h3>
        <div className="city-card-actions">
          <button
            className="favorite-star city-card-favorite"
            onClick={() => dispatch(toggleFavorite(city.name))}
            aria-label={`${isFav ? "Remove from favorites" : "Add to favorites"}: ${city.name}`}
            aria-pressed={isFav}
          >
            {isFav ? "★" : "☆"}
          </button>
          {onRemove && (
            <button
              type="button"
              className="city-card-remove"
              onClick={onRemove}
              aria-label={`Remove ${city.name} from your cities`}
              title="Remove city"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      </div>

      <div className="city-card-weather">
        <div className="city-temp city-card-temperature">{Math.round(city.main.temp)}{temperatureSuffix}</div>
        <div className="city-icon city-card-icon">
          <img
            src={`https://openweathermap.org/img/wn/${city.weather[0].icon}@2x.png`}
            alt={city.weather[0].description}
          />
        </div>
      </div>

      <div className="city-card-description">{city.weather[0].description}</div>

      <Link to={`/city/${encodeURIComponent(city.name)}`} className="city-card-details">
        Details →
      </Link>
    </div>
  );
}
