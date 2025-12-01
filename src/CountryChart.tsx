import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button, Box, Typography } from "@mui/material";

interface CountryChartProps {
  countryData: Record<string, any>;
  allCountriesData: Record<string, any>[]; // 🔥 nouveau
  onClose?: () => void;
}

const MONTHS = [
  "janv-25", "févr-25", "mars-25", "avr-25", "mai-25", "juin-25",
  "juil-25", "août-25", "sept-25", "oct-25", "nov-25", "déc-25",
  "janv-26", "févr-26", "mars-26", "avr-26", "mai-26", "juin-26",
  "juil-26", "août-26", "sept-26", "oct-26", "nov-26", "déc-26",
  "janv-27", "févr-27", "mars-27", "avr-27", "mai-27", "juin-27",
  "juil-27", "août-27", "sept-27", "oct-27", "nov-27", "déc-27",
];

const normalizeKey = (key: string) =>
  key
    .replace(/\s+/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const CountryChart: React.FC<CountryChartProps> = ({
  countryData,
  allCountriesData,
  onClose,
}) => {
  if (!countryData) return null;

  const isFrance = countryData.ADM0_A3 === "FRA";

  // Créer un mapping des clés normalisées vers les clés originales
  const keyMapping: Record<string, string> = {};
  Object.keys(countryData).forEach((key) => {
    keyMapping[normalizeKey(key)] = key;
  });

  //  Calcul du % pour chaque mois
  const data = MONTHS.map((month) => {
    const normalizedMonth = normalizeKey(month);
    const originalKey = keyMapping[normalizedMonth];

    if (!originalKey) {
      return { month, value: 0 };
    }

    // Créer une liste de pays uniques par ADM0_A3 (comme dans Cartogram)
    const uniqueCountries = Array.from(
      new Map(
        allCountriesData.map((c: any) => [c.ADM0_A3, c])
      ).values()
    ) as any[];

    // Somme des valeurs du mois pour tous les pays sauf FRA et NOM
    const totalMonth = uniqueCountries
      .filter((c: any) => c.ADM0_A3 !== "FRA" && c.ADM0_A3 !== "NOM")
      .map((c: any) => c[originalKey] ?? 0)
      .filter((v) => typeof v === "number" && !isNaN(v))
      .reduce((acc, v) => acc + v, 0);

    const countryValue = countryData[originalKey] ?? 0;
    const percent = totalMonth > 0 ? ((countryValue / totalMonth) * 100) : 0;

    return {
      month,
      value: percent,
    };
  }).filter((d) => d.value > 0 || keyMapping[normalizeKey(d.month)]);

  // Calcul de la valeur maximale pour ajuster l'échelle Y
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  const yAxisMax = Math.ceil(maxValue); // Ajoute 10% de marge au-dessus

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 300,
        height: 80,
        p: 0,
      }}
    >
      {isFrance ? (
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            marginTop: 1,
            marginBottom: 0,
            color: "#444",
            textAlign: "left",
            fontFamily: "'Open Sans', sans-serif !important",
          }}
        >
          La France n’est pas considérée dans cette analyse pour éviter tout biais.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "'Open Sans', sans-serif" }} />
            <YAxis 
              tick={{ fontSize: 11, fontFamily: "'Open Sans', sans-serif" }} 
              domain={[0, yAxisMax]} 
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)}%`}
              labelFormatter={() => "Part dans le total des mentions"}
            />
            <Bar dataKey="value" fill="#2383c4" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {onClose && (
        <Box sx={{ display: "flex", justifyContent: "left", mt: 0.2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            sx={{
              borderRadius: "16px",
              backgroundColor: "transparent",
              borderColor: "#888",
              color: "#444",
              fontFamily: "'Open Sans', sans-serif !important",
              "&:hover": {
                backgroundColor: "rgba(0,0,0,0.05)",
                borderColor: "#555",
              },
            }}
          >
            Fermer
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CountryChart;
