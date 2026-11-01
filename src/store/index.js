import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./appSlice";

const store = configureStore({ reducer: { app: appReducer } });

try {
  const raw = localStorage.getItem("weatherAppState");
  if (raw) store.dispatch({ type: "app/loadFromStorage", payload: JSON.parse(raw) });
} catch (e) { console.warn(e); }

store.subscribe(() => {
  const state = store.getState().app;
  localStorage.setItem("weatherAppState", JSON.stringify(state));
});

export default store;
