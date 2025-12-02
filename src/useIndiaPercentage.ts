import { useState, useEffect } from "react";
import type { Feature } from "geojson";

export function useIndiaPercentage() {
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

          // Somme pour l’Inde (IND)
          const indiaSum = filteredFeatures
            .filter(f => f.properties.ADM0_A3 === "IND")
            .reduce((sum, f) => sum + (f.properties.current ?? 0), 0);

          // Calcul du pourcentage
          const percentageValue = Math.round((indiaSum / totalSum) * 100);
          setPercentage(percentageValue);
        }
      )
      .catch(err => console.error("Erreur de lecture du GeoJSON :", err));
  }, []);

  return percentage;
}
