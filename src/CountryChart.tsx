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
import { Button, Box } from "@mui/material";

interface CountryChartProps {
  countryData: Record<string, any>;
  onClose?: () => void;
}

const MONTHS = [
  "janv-25",
  "févr-25",
  "mars-25",
  "avr-25",
  "mai-25",
  "juin-25",
  "juil-25",
  "août-25",
  "sept-25",
];

const normalizeKey = (key: string) =>
  key
    .replace(/\s+/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const CountryChart: React.FC<CountryChartProps> = ({ countryData, onClose }) => {
  if (!countryData) return null;

  const normalizedData: Record<string, any> = {};
  for (const key in countryData) {
    normalizedData[normalizeKey(key)] = countryData[key];
  }

  const data = MONTHS.map((month) => {
    const normalizedMonth = normalizeKey(month);
    return {
      month,
      value: normalizedData[normalizedMonth] ?? 0,
    };
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: 300,      // largeur de la box
        height: 80,      // hauteur de la box
        p: 0,            // padding
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip 
            formatter={(value: number) => value.toLocaleString()} 
            labelFormatter={() => "Mentions"} 
          />
          <Bar dataKey="value" fill="#8eacb2ff" />
        </BarChart>
      </ResponsiveContainer>

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
