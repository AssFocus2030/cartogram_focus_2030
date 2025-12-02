import { useState, useEffect } from "react";
import type { Feature } from "geojson";

const EUROPE_A3 = [
  "ALB", "AND", "AUT", "BLR", "BEL", "BIH", "BGR", "HRV", "CYP", "CZE", "DNK",
  "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ITA", "LVA", "LTU",
  "LUX", "MLT", "MDA", "MNE", "NLD", "MKD", "NOR", "POL", "PRT", "ROU", "SMR",
  "SRB", "SVK", "SVN", "ESP", "SWE", "CHE", "GBR", "UKR", "VAT", "MCO",
];

export function useEuropePercentage() {
  const [percentage, setPercentage] = useState<number | null>(null);

  useEffect(() => {
    fetch("/world.geojson")
      .then(res => res.json())
      .then(
        (
          data: {
            features: Feature<any, { ADM0_A3?: string; current?: number }>[];
          }
        ) => {
          // Exclure la France (FRA)
          const filteredFeatures = data.features.filter(
            f => f.properties.ADM0_A3 !== "FRA"
          );

          // Somme totale sans la France
          const totalSum = filteredFeatures.reduce(
            (sum, f) => sum + (f.properties.current ?? 0),
            0
          );

          // Somme pour l’Europe sans la France
          const europeSum = filteredFeatures
            .filter(f => EUROPE_A3.includes(f.properties.ADM0_A3 ?? ""))
            .reduce((sum, f) => sum + (f.properties.current ?? 0), 0);

          // Calcul du pourcentage
          const percentageValue = Math.round((europeSum / totalSum) * 100);
          setPercentage(percentageValue);
        }
      )
      .catch(err => console.error("Erreur de lecture du GeoJSON :", err));
  }, []);

  return percentage;
}
