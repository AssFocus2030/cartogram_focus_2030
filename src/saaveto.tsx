import React, { useState, useEffect } from "react";
import { Switch, Box, IconButton, Typography, Button, Slide } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import World from "./assets/World.svg";
import New from "./assets/News.svg";
import { useEuropePercentage } from "./useEuropePercentage";
import { useAfricaPercentage } from "./useAfricaPercentage";
import { useIndiaPercentage } from "./useIndiaPercentage";
import { usePMAPercentage } from "./usePMAPercentage";

interface MapToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onShowPMA?: () => void;
  onShowAfrica?: () => void;
  onShowIndia?: () => void;
  onShowEurope?: () => void;
}

const MapToggle: React.FC<MapToggleProps> = ({
  checked,
  onChange,
  onShowPMA,
  onShowAfrica,
  onShowIndia,
  onShowEurope,
}) => {
  const [localChecked, setLocalChecked] = useState(checked);
  const [userInteracted, setUserInteracted] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const [showPMABox, setShowPMABox] = useState(true);
  const [showAfricaBox, setShowAfricaBox] = useState(false);
  const [showIndiaBox, setShowIndiaBox] = useState(false);
  const [showEuropeBox, setShowEuropeBox] = useState(false);

  const percentageEurope = useEuropePercentage();
  const percentageAfrica = useAfricaPercentage();
  const percentageIndia = useIndiaPercentage();
  const percentagePMA = usePMAPercentage();

  useEffect(() => {
    if (userInteracted) return;
    const timer = setTimeout(() => {
      setLocalChecked(true);
      onChange(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [onChange, userInteracted]);

  const handleNextFromPMA = () => {
    setShowPMABox(false);
    setShowAfricaBox(true);
    if (onShowAfrica) onShowAfrica();
  };

  const handlePrevFromPMA = () => {
    setShowPMABox(false);
    setMinimized(false);
  };

  const handleNextFromAfrica = () => {
    setShowAfricaBox(false);
    setShowIndiaBox(true);
    if (onShowIndia) onShowIndia();
  };

  const handlePrevFromAfrica = () => {
    setShowAfricaBox(false);
    setShowPMABox(true);
    if (onShowPMA) onShowPMA();
  };

  const handleNextFromIndia = () => {
    setShowIndiaBox(false);
    setShowEuropeBox(true);
    if (onShowEurope) onShowEurope();
  };

  const handlePrevFromIndia = () => {
    setShowIndiaBox(false);
    setShowAfricaBox(true);
    if (onShowAfrica) onShowAfrica();
  };

  const handlePrevFromEurope = () => {
    setShowEuropeBox(false);
    setShowIndiaBox(true);
    if (onShowIndia) onShowIndia();
  };

  return (
    <>
      {/* Barre principale */}
      <Box sx={{ display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif", width: "fit-content" }}>
        <Box display="flex" alignItems="center" gap={1}>
          <img src={localChecked ? New : World} alt="" style={{ width: 20, height: 20 }} />
          <Switch
            checked={localChecked}
            onChange={(e) => {
              setLocalChecked(e.target.checked);
              onChange(e.target.checked);
              setUserInteracted(true);
            }}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "black" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "black" },
              "& .MuiSwitch-track": { backgroundColor: "rgba(0,0,0,0.3)" },
            }}
          />
          <IconButton size="small" onClick={() => setMinimized(!minimized)} sx={{ p: 0, color: "#888" }}>
            {minimized ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>

        {/* Texte d'introduction */}
        <Slide direction="up" in={!minimized} mountOnEnter unmountOnExit>
          <Box sx={{ mt: 0.5, maxWidth: 280 }}>
            <Typography
              variant="body2"
              sx={{ fontSize: "11px", lineHeight: 1.4, color: "#444", mb: 1 }}
            >
              Cette carte illustre <strong>la vision du monde véhiculée par les médias français</strong>.  
              Chaque pays y est redimensionné selon le nombre de fois où il est cité dans la presse,
              dessinant une planète à l’échelle de l’attention médiatique française.
            </Typography>
          </Box>
        </Slide>
      </Box>

      {/* 🟡 Box PMA */}
      <Slide direction="up" in={showPMABox} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 20,
            right: 20,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5, color: "#dcababff", fontSize: "11px" }}>
            PMA
          </Typography>

          {percentagePMA !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              Les 44 pays les plus vulnérables*, où se concentrent pourtant les principaux défis du développement,
              ne représentent que <strong>{percentagePMA.toFixed(0)}%</strong> des pays mentionnés dans les médias français.
              *Liste de l'ONU.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#888", fontSize: "11px" }}>
              Calcul du pourcentage en cours...
            </Typography>
          )}

          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleNextFromPMA}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Suivant
            </Button>
          </Box>
        </Box>
      </Slide>

      {/* 🟤 Box Afrique */}
      <Slide direction="up" in={showAfricaBox} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5, color: "#c5b171ff", fontSize: "11px" }}>
            Afrique
          </Typography>

          {percentageAfrica !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageAfrica.toFixed(0)}%</strong> des mentions dans les médias français
              concernent les <strong>54</strong> pays du continent africain.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#888", fontSize: "11px" }}>
              Calcul du pourcentage en cours...
            </Typography>
          )}

          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handlePrevFromAfrica}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Précédent
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleNextFromAfrica}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Suivant
            </Button>
          </Box>
        </Box>
      </Slide>

      {/* 🟣 Box Inde */}
      <Slide direction="down" in={showIndiaBox} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 20,
            right: 20,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5, color: "#e79abaff", fontSize: "11px" }}>
            Inde
          </Typography>

          {percentageIndia !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageIndia.toFixed(0)}%</strong> des mentions concernent l’Inde où vit <strong>18%</strong> de la population mondiale.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#888", fontSize: "11px" }}>
              Calcul du pourcentage en cours...
            </Typography>
          )}

          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handlePrevFromIndia}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Précédent
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleNextFromIndia}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Suivant
            </Button>
          </Box>
        </Box>
      </Slide>

      {/* 🔵 Box Europe */}
      <Slide direction="up" in={showEuropeBox} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5, color: "#81a685ff", fontSize: "11px" }}>
            Europe
          </Typography>

          {percentageEurope !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageEurope.toFixed(0)}%</strong> des mentions concernent les pays européens (hors France).
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "#888", fontSize: "11px" }}>
              Calcul du pourcentage en cours...
            </Typography>
          )}

          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handlePrevFromEurope}
              sx={{
                borderRadius: "16px",
                backgroundColor: "transparent",
                borderColor: "#888",
                color: "#444",
                fontSize: "11px",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
              }}
            >
              Précédent
            </Button>
          </Box>
        </Box>
      </Slide>
    </>
  );
};

export default MapToggle;
