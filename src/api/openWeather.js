import axios from "axios";

const API_KEY = import.meta.env.VITE_OWM_KEY;
const BASE = "https://api.openweathermap.org/data/2.5";

const client = axios.create({ baseURL: BASE, timeout: 10000 });

export function getCurrentWeatherByCityName(q, units = "metric", signal) {
  return client.get("/weather", { params: { q, appid: API_KEY, units, lang: "en" }, signal })
               .then(res => res.data);
}

export function getCurrentWeatherByCoordinates(lat, lon, units = "metric", signal) {
  return client.get("/weather", { params: { lat, lon, appid: API_KEY, units, lang: "en" }, signal })
               .then(res => res.data);
}

export function get5DayForecastByCityName(q, units = "metric") {
  return client.get("/forecast", { params: { q, appid: API_KEY, units, lang: "en" } })
               .then(res => res.data);
}

export function getCitySuggestions(q, signal) {
  return client.get("https://api.openweathermap.org/geo/1.0/direct", {
    params: { q, limit: 3, appid: API_KEY },
    signal,
  }).then(res => res.data);
}
