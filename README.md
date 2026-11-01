# Weather App

A responsive weather application built with React. Search for cities, compare current conditions, and view forecasts. This project was developed as a student / Junior Frontend portfolio application.

## Features

- Current weather for multiple cities.
- City search with up to three autocomplete suggestions.
- A five-day forecast with up to five upcoming calendar days, using the available sample closest to local noon.
- Browser geolocation with an independent manual-city fallback.
- Favorite cities, available from city cards and City Details.
- Add and remove dashboard cities, with an empty-dashboard state.
- Celsius, Fahrenheit, and Kelvin temperature modes.
- Independent manual refresh controls and last-successful-update times for the dashboard and featured weather.
- Responsive layouts with a soft blue/lavender palette and translucent surfaces.

Dashboard cities, favorites, and the selected units are saved in the browser's localStorage. Precise geolocation coordinates are kept in memory only.

## Technologies

React 19, JavaScript, Redux Toolkit, React Router, Axios, Vite, CSS, and the OpenWeather API.

## Installation and setup

You need Node.js and npm. Vite 7 requires Node.js 20.19+ on the 20.x line, or Node.js 22.12 or later.

1. Open a terminal in the project folder and install the locked dependencies:

   ```sh
   npm ci
   ```

2. Copy `.env.example` to `.env`.

   In PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS or Linux:

   ```sh
   cp .env.example .env
   ```

3. Create a personal key in your OpenWeather account. In your local `.env`, replace `YOUR_OPENWEATHER_API_KEY` with that key:

   ```dotenv
   VITE_OWM_KEY=YOUR_OPENWEATHER_API_KEY
   ```

   The application uses current weather, the five-day / three-hour forecast, and direct geocoding. Make sure your key has access to these endpoints. New keys may need time to become active.

4. Start the development server:

   ```sh
   npm run dev
   ```

   Open the local URL printed in the terminal. Restart the server after changing `.env`.

Do not commit a real `.env` file. Variables prefixed with `VITE_` are included in the browser application, so this API key is browser-visible even when supplied through a deployment environment variable. Use a dedicated demo key and monitor its usage; confidential keys require a server-side solution.

## Build and checks

Create the production build in `dist`:

```sh
npm run build
```

Preview that build locally:

```sh
npm run preview
```

Check the source with ESLint:

```sh
npm run lint
```

The preview command is for local verification, not production hosting.

## Location permission

Location is requested only when you select **Use my location**. If permission is denied or location is unavailable, select **Choose a city manually** in the featured panel. That selection does not add a dashboard city or favorite.

Geolocation requires HTTPS in production; localhost is normally supported for development. Refreshing weather or changing units reuses the selected location without asking for it again. The featured location is not persisted and must be selected again after reloading or leaving Home.

## Deployment

Deploy as a Vite single-page application. For Vercel, use:

- Build command: `npm run build`
- Output directory: `dist`
- Build environment variable: `VITE_OWM_KEY`, set to your own API key

Configure an SPA fallback to `index.html` for application routes if the host does not provide one. Verify that directly opening or reloading `/favorites` and `/city/London` works. Setting environment variables requires a new deployment to update the built application.

Deployment configuration and a public demo URL are not included in this copy.

## Limitations

- City names are used as identifiers, so different places with identical names may be ambiguous.
- Forecast cards represent selected three-hour intervals, not daily averages or daily minimum/maximum temperatures. The API's fixed timezone offset can be inaccurate across daylight-saving transitions.
- Favorites and City Details have basic request-error handling; rapid changes or unavailable API responses may produce incomplete or outdated results.
- Weather and autocomplete depend on network access and the API key's activation, permissions, and request limits.
- Preferences are stored in this browser only and do not synchronize between devices.
