import React from "react";
import { Switch } from "@mui/material";
import World from "./assets/World.svg";
import New from "./assets/News.svg";

interface MapToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const MapToggle: React.FC<MapToggleProps> = ({ checked, onChange }) => {
  const labelText = checked
    ? "Voir le planisphère"
    : "Voir le monde selon la presse française";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px", fontFamily: "Arial, sans-serif" }}>
      {/* Texte avant le switch */}
      <span style={{ fontWeight: 'normal' }}>{labelText}</span>

      {/* SVG */}
      <img
        src={checked ? New : World}
        alt={labelText}
        style={{ width: 24, height: 24 }}
      />

      {/* Switch */}
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: 'black',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: 'black',
          },
          '& .MuiSwitch-track': {
            backgroundColor: 'rgba(0,0,0,0.3)',
          },
        }}
      />
    </div>
  );
};

export default MapToggle;
