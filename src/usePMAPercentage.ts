import { useState, useEffect } from "react";
import type { Feature } from "geojson";
import { PMACountriesISO_A3 } from "./PMAcountries.ts";

export function usePMAPercentage() {
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
          const features = data.features;

          // Exclure la France (FRA)
          const filteredFeatures = features.filter(
            f => f.properties.ADM0_A3 !== "FRA"
          );

          // Somme totale sans la France
          const totalSum = filteredFeatures.reduce(
            (sum, f) => sum + (f.properties.current ?? 0),
            0
          );

          // Somme pour les pays PMA (également sans la France)
          const pmaSum = filteredFeatures
            .filter(f => PMACountriesISO_A3.includes(f.properties.ADM0_A3 ?? ""))
            .reduce((sum, f) => sum + (f.properties.current ?? 0), 0);

          // Calcul du pourcentage
          const percentageValue = Math.round((pmaSum / totalSum) * 100);
          setPercentage(percentageValue);
        }
      )
      .catch(err => console.error("Erreur de lecture du GeoJSON :", err));
  }, []);

  return percentage;
}
