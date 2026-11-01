import { Link, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Favorites from "./pages/Favorites";
import CityDetails from "./pages/CityDetails";
import UnitSwitcher from "./components/UnitSwitcher";

export default function App() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <Link to="/" className="header-link">
            Weather Forecast
          </Link>
        </h1>
        <nav className="app-nav" aria-label="Main navigation">
          {location.pathname !== "/favorites" && (
            <Link to="/favorites" className="app-nav-link">
              Favorites
            </Link>
          )}
          <UnitSwitcher />
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/city/:name" element={<CityDetails />} />
        </Routes>
      </main>
    </div>
  );
}
