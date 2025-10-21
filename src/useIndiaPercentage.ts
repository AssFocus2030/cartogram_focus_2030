import { useState, useEffect } from "react";
import type { Feature } from "geojson";

export function useIndiaPercentage() {
  const [percentage, setPercentage] = useState<number | null>(null);

  useEffect(() => {
    fetch("/world_def.geojson")
      .then(res => res.json())
      .then(
        (
          data: {
            features: Feature<
              any,
              { ADM0_A3?: string; current?: number }
            >[];
          }
        ) => {
          const features = data.features;

          // Somme totale de la colonne "current"
          const totalSum = features.reduce(
            (sum, f) => sum + (f.properties.current ?? 0),
            0
          );

          // Somme des valeurs uniquement pour l'Inde (code ISO A3 = "IND")
          const indiaSum = features
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
