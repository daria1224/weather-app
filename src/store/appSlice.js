import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  unit: "metric",  
  favorites: [],   
};

const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setUnit(state, action) {
      state.unit = action.payload;
    },
    toggleFavorite(state, action) {
      const city = action.payload;
      const idx = state.favorites.indexOf(city);
      if (idx === -1) state.favorites.push(city);
      else state.favorites.splice(idx, 1);
    },
    loadFromStorage(state, action) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setUnit, toggleFavorite, loadFromStorage } = slice.actions;
export default slice.reducer;
