import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface Top5CountriesProps {
  geoData: any[];
  onClose: () => void;
}

interface CountryData {
  name: string;
  mentions: number;
  perMillion: number;
  iso: string;
}

const Top5Countries: React.FC<Top5CountriesProps> = ({ geoData, onClose }) => {
  const [top5ByMentions, setTop5ByMentions] = useState<CountryData[]>([]);
  const [bottom5ByMentions, setBottom5ByMentions] = useState<CountryData[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<"top" | "bottom">("top");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Déclencher l'animation d'entrée après le montage
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Attendre la fin de l'animation avant de fermer
  };

  useEffect(() => {
    if (geoData.length === 0) return;

    // Créer une liste unique par pays (ADM0_A3)
    const uniqueCountries = Array.from(
      new Map(
        geoData.map((f: any) => [f.properties.ADM0_A3, f])
      ).values()
    ) as any[];

    // Filtrer France et pays sans données
    const validCountries = uniqueCountries
      .filter((f: any) => 
        f.properties.ADM0_A3 !== "FRA" && 
        f.properties.ADM0_A3 !== "NOM" &&
        f.properties.current > 0 &&
        (f.properties.POP_EST ?? 0) > 1000000
      )
      .map((f: any) => {
        const current = f.properties.current ?? 0;
        const pop = f.properties.POP_EST ?? 0;
        const perMillion = pop > 0 ? (current / pop) * 1e6 : 0;
        
        return {
          name: f.properties.NAME_FR || f.properties.NAMEfr || "Inconnu",
          mentions: current,
          perMillion: Math.round(perMillion),
          iso: f.properties.ADM0_A3,
        };
      });

    // Top 5 par nombre de mentions
    const sortedByMentions = [...validCountries]
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    // Bottom 5 (pays les moins cités)
    const sortedBottom5 = [...validCountries]
      .sort((a, b) => a.mentions - b.mentions)
      .slice(0, 5);

    setTop5ByMentions(sortedByMentions);
    setBottom5ByMentions(sortedBottom5);
  }, [geoData]);

  return (
    <>
      {/* Backdrop avec transition */}
      <Box
        onClick={handleClose}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "rgba(0, 0, 0, 0.3)",
          zIndex: 1999,
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
      
      <Box
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: isVisible 
            ? "translate(-50%, -50%) scale(1)" 
            : "translate(-50%, -50%) scale(0.8)",
          bgcolor: "white",
          p: 2,
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 2000,
          maxWidth: 380,
          width: "35%",
          maxHeight: "70vh",
          opacity: isVisible ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#2383c4", fontFamily: "'Open Sans', sans-serif", fontSize: "15px" }}>
          Top 5 des pays
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Système d'onglets */}
      <Box sx={{ borderBottom: "2px solid #e0e0e0", mb: 1.5, mt: 0.5 }}>
        <Box sx={{ display: "flex", gap: 0 }}>
          <Box
            onClick={() => setSelectedPanel("top")}
            sx={{
              flex: 1,
              py: 1,
              textAlign: "center",
              cursor: "pointer",
              borderBottom: "3px solid",
              borderColor: selectedPanel === "top" ? "#2383c4" : "transparent",
              color: selectedPanel === "top" ? "#2383c4" : "#666",
              fontWeight: selectedPanel === "top" ? 600 : 500,
              fontSize: "12px",
              fontFamily: "'Open Sans', sans-serif",
              transition: "all 0.2s",
              "&:hover": {
                color: "#2383c4",
                bgcolor: "#f8f9fa",
              },
            }}
          >
            Les plus mentionnés
          </Box>
          <Box
            onClick={() => setSelectedPanel("bottom")}
            sx={{
              flex: 1,
              py: 1,
              textAlign: "center",
              cursor: "pointer",
              borderBottom: "3px solid",
              borderColor: selectedPanel === "bottom" ? "#e05a55" : "transparent",
              color: selectedPanel === "bottom" ? "#e05a55" : "#666",
              fontWeight: selectedPanel === "bottom" ? 600 : 500,
              fontSize: "12px",
              fontFamily: "'Open Sans', sans-serif",
              transition: "all 0.2s",
              "&:hover": {
                color: "#e05a55",
                bgcolor: "#fff5f5",
              },
            }}
          >
            Les moins mentionnés (pays de plus de 1M hab.)
          </Box>
        </Box>
      </Box>

      {/* Contenu dynamique selon le panneau sélectionné */}
      <Box sx={{ overflowY: "auto", flex: 1 }}>
        {(selectedPanel === "top" ? top5ByMentions : bottom5ByMentions).map((country, index) => (
          <Box
            key={country.iso}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.2,
              px: 1.5,
              mb: 1,
              borderRadius: 2,
              bgcolor: index === 0 && selectedPanel === "top" ? "#e9eff9" : "#f8f9fa",
              border: "1px solid",
              borderColor: index === 0 && selectedPanel === "top" ? "#2383c4" : "#e0e0e0",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: "16px",
                  color: index === 0 && selectedPanel === "top" ? "#2383c4" : "#666",
                  minWidth: 20,
                  fontFamily: "'Open Sans', sans-serif",
                }}
              >
                {index + 1}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 500,
                  fontSize: "13px",
                  fontFamily: "'Open Sans', sans-serif",
                }}
              >
                {country.name}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: "13px",
                color: selectedPanel === "bottom" ? "#e05a55" : "#2383c4",
                fontFamily: "'Open Sans', sans-serif",
              }}
            >
              {country.mentions.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
    </>
  );
};

export default Top5Countries;
