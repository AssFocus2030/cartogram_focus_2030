import { useState, useEffect } from "react";
import type { Feature } from "geojson";

const AFRICA_A3 = [
  "DZA","AGO","BEN","BWA","BFA","BDI","CPV","CMR","CAF","TCD",
  "COM","COD","COG","CIV","DJI","EGY","GNQ","ERI","SWZ","ETH",
  "GAB","GMB","GHA","GIN","GNB","KEN","LSO","LBR","LBY","MDG",
  "MWI","MLI","MRT","MUS","MAR","MOZ","NAM","NER","NGA","RWA",
  "STP","SEN","SYC","SLE","SOM","ZAF","SSD","SDN","TZA","TGO",
  "TUN","UGA","ZMB","ZWE","ESH" // Sahara occidental
];

export function useAfricaPercentage() {
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
          // Exclure la France (FRA)
          const filteredFeatures = data.features.filter(
            f => f.properties.ADM0_A3 !== "FRA"
          );

          // Somme totale sans la France
          const totalSum = filteredFeatures.reduce(
            (sum, f) => sum + (f.properties.current ?? 0),
            0
          );

          // Somme des valeurs pour les pays africains (sans la France)
          const africaSum = filteredFeatures
            .filter(f => AFRICA_A3.includes(f.properties.ADM0_A3 ?? ""))
            .reduce((sum, f) => sum + (f.properties.current ?? 0), 0);

          // Calcul du pourcentage
          const percentageValue = Math.round((africaSum / totalSum) * 100);
          setPercentage(percentageValue);
        }
      )
      .catch(err => console.error("Erreur de lecture du GeoJSON :", err));
  }, []);

  return percentage;
}
