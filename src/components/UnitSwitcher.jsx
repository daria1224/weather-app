import { useSelector, useDispatch } from "react-redux";
import { setUnit } from "../store/appSlice";

export default function UnitSwitcher() {
  const unit = useSelector(state => state.app.unit);
  const dispatch = useDispatch();

  if (!unit) return null; 

  return (
    <select
      value={unit}
      onChange={(e) => dispatch(setUnit(e.target.value))}
      className="unit-switcher"
      aria-label="Temperature unit"
    >
      <option value="metric">°C</option>
      <option value="imperial">°F</option>
      <option value="standard">K</option>
    </select>
  );
}
