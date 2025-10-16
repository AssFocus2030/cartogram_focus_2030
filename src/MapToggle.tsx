import React, { useState } from "react";
import { Switch, Box, IconButton, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import World from "./assets/World.svg";
import New from "./assets/News.svg";

interface MapToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const MapToggle: React.FC<MapToggleProps> = ({ checked, onChange }) => {
  const [minimized, setMinimized] = useState(false); // pour toute la box

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        width: minimized ? "auto" : "fit-content",
        transition: "width 0.3s",
      }}
    >
      {!minimized && (
        <>
          {/* Ligne icône + switch + flèche */}
          <Box display="flex" alignItems="center" gap={1}>
            <img
              src={checked ? New : World}
              alt=""
              style={{ width: 20, height: 20 }}
            />

            <Switch
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "black" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "black" },
                "& .MuiSwitch-track": { backgroundColor: "rgba(0,0,0,0.3)" },
              }}
            />

            {/* Flèche pour replier toute la box */}
            <IconButton
              size="small"
              onClick={() => setMinimized(!minimized)}
              sx={{ p: 0, color: "#888" }}
            >
              {minimized ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Box>

          {/* Texte explicatif affiché par défaut */}
          <Typography
            variant="body2"
            sx={{
              fontSize: "12px",
              lineHeight: 1.3,
              color: "#444",
              m: 0,
              mt: 0.5,
              maxWidth: 280,
            }}
          >
            Cette carte illustre la vision du monde véhiculée par les médias français.
            Chaque pays y est redimensionné selon le nombre de fois où il est cité dans la presse,
            dessinant une planète à l’échelle de l’attention médiatique française.
          </Typography>
        </>
      )}

      {minimized && (
        <Box display="flex" alignItems="center" gap={1}>
          <img
            src={checked ? New : World}
            alt=""
            style={{ width: 20, height: 20 }}
          />
          <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "black" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "black" },
              "& .MuiSwitch-track": { backgroundColor: "rgba(0,0,0,0.3)" },
            }}
          />
          {/* Flèche visible même en minimized */}
          <IconButton
            size="small"
            onClick={() => setMinimized(!minimized)}
            sx={{ p: 0, color: "#888" }}
          >
            {minimized ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default MapToggle;
