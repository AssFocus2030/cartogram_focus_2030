import React, { useState, useEffect } from "react";
import {
  Switch,
  Box,
  IconButton,
  Typography,
  Button,
  Slide,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; // <-- import du logo i
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
  onHidePopulationChoro?: () => void;
}

const MapToggle: React.FC<MapToggleProps> = ({
  checked,
  onChange,
  onShowPMA,
  onShowAfrica,
  onShowIndia,
  onShowEurope,
  onHidePopulationChoro,
}) => {
  const [localChecked, setLocalChecked] = useState(checked);
  const [userInteracted, setUserInteracted] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [showPMABox, setShowPMABox] = useState(true);
  const [showAfricaBox, setShowAfricaBox] = useState(false);
  const [showIndiaBox, setShowIndiaBox] = useState(false);
  const [showEuropeBox, setShowEuropeBox] = useState(false);

  const [showArrowHint, setShowArrowHint] = useState(true); // 👈 affichage temporaire de l'indication

  const percentageEurope = useEuropePercentage();
  const percentageAfrica = useAfricaPercentage();
  const percentageIndia = useIndiaPercentage();
  const percentagePMA = usePMAPercentage();

  // ✅ Affiche le message respirant pendant 3 secondes
  useEffect(() => {
    const timer = setTimeout(() => setShowArrowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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
    if (onHidePopulationChoro) onHidePopulationChoro();
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

  // ✅ Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;
      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        if (showPMABox) handleNextFromPMA();
        else if (showAfricaBox) handleNextFromAfrica();
        else if (showIndiaBox) handleNextFromIndia();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (showAfricaBox) handlePrevFromAfrica();
        else if (showIndiaBox) handlePrevFromIndia();
        else if (showEuropeBox) handlePrevFromEurope();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPMABox, showAfricaBox, showIndiaBox, showEuropeBox]);

  return (
    <>
      {/* ✅ Indication respirante temporaire */}
      {showArrowHint && (
       <Box
  sx={{
    position: "fixed",
    bottom: "50%",
    left: "50%",
    transform: "translate(-50%, 50%)",
    bgcolor: "rgba(255,255,255,0.9)",
    px: 3,
    py: 1.5,
    borderRadius: 10,
    boxShadow: 3,
    fontSize: "13px",
    color: "#333",
    animation: "pulse 1s ease-in-out infinite",
    "@keyframes pulse": {
      "0%": { opacity: 0.8 },
      "50%": { opacity: 1 },
      "100%": { opacity: 0.8 },
    },
    zIndex: 2000,
  }}
>
  <strong>← Utilisez les flèches du clavier → pour naviguer</strong>
</Box>

      )}



     {/* Barre principale */}
<Box
  sx={{
    display: "flex",
    flexDirection: "column",
    fontFamily: "Arial, sans-serif",
    width: "fit-content",
    position: "fixed",
    top: 20,
    right: 20,
    bgcolor: "white",
    p: minimized ? 1 : 2,   // <- padding réduit quand replié
    borderRadius: 2,
    boxShadow: 3,
    zIndex: 1000,
    transition: "all 0.3s ease", // <- transition douce pour le repliage
    overflow: "hidden", 
  }}
>
  <Box display="flex" alignItems="center" gap={1}>
    <img
      src={localChecked ? New : World}
      alt=""
      style={{ width: 20, height: 20 }}
    />
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
        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
          backgroundColor: "black",
        },
        "& .MuiSwitch-track": { backgroundColor: "rgba(0,0,0,0.3)" },
      }}
    />
   <IconButton
  size="small"
  onClick={() => setMinimized(!minimized)}
  sx={{ p: 0, color: "#888" }}
>
  {minimized ? (
    <InfoOutlinedIcon fontSize="small" /> // ← affiché quand la box est repliée
  ) : (
    <ChevronRightIcon fontSize="small" /> // ← affiché quand la box est ouverte
  )}
</IconButton>

  </Box>

  {/* Texte d'introduction */}
  <Slide direction="up" in={!minimized} mountOnEnter unmountOnExit>
    <Box sx={{ mt: 0.5, maxWidth: 280 }}>
      <Typography
        variant="body2"
        sx={{
          fontSize: "11px",
          lineHeight: 1.4,
          color: "#444",
          mb: 1,
        }}
      >
        Cette carte illustre{" "}
        <strong>
          la vision du monde véhiculée par les médias français
        </strong>
        . Chaque pays y est redimensionné selon le nombre de fois où il
        est cité dans la presse, dessinant une planète à l’échelle de
        l’attention médiatique française.
      </Typography>
    </Box>
  </Slide>
</Box>



      {/* 🔘 Box PMA */}
      <Slide direction="up" in={showPMABox} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            bgcolor: "white",
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: "bold",
              mb: 0,
              color: "#ba2f33ff",
              fontSize: "12px",
            }}
          >
            PMA
          </Typography>
          {percentagePMA !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
  Les <strong>44 pays les plus vulnérables*</strong>, où se concentrent pourtant les
  principaux défis du développement, ne représentent que{" "}
  <strong>{percentagePMA.toFixed(0)}%</strong> des pays mentionnés
  dans les <strong>médias français</strong>. *Liste de l'ONU.
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
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
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
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: "bold",
              mb: 0,
              color: "#155c22ff",
              fontSize: "12px",
            }}
          >
            Afrique
          </Typography>
          {percentageAfrica !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageAfrica.toFixed(0)}%</strong> des mentions dans
              les médias français concernent les <strong>54</strong> pays du
              continent africain.
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
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
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
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
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
            bottom: 20,
            right: 20,
            bgcolor: "white",
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
            
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: "bold",
              mb: 0,
              color: "#aa1f62",
              fontSize: "12px",
            }}
          >
            Inde
          </Typography>
          {percentageIndia !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageIndia.toFixed(0)}%</strong> des mentions
              concernent l’Inde où vit <strong>18% de la population
              mondiale.</strong> 
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
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
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
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: "#555",
                },
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
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
            maxWidth: 300,
            width: "30vw",
            fontSize: "11px",
            lineHeight: 1.3,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: "bold",
              mb: 0,
              color: "#d8a942ff",
              fontSize: "12px",
            }}
          >
            Europe
          </Typography>
          {percentageEurope !== null ? (
            <Typography variant="body2" sx={{ fontSize: "11px" }}>
              <strong>{percentageEurope.toFixed(0)}%</strong> des mentions
              concernent les pays européens. (France exclue)
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
