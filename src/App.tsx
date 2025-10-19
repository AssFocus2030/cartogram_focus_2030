import React, { useEffect } from "react";
import Cartogram from "./Cartogram";

const geoUrls = [
  "/world_def.geojson",
  "/Cartogram_m.geojson",
];



const App: React.FC = () => {
  // Bloque le scroll global
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.documentElement.style.margin = "0";
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.window}>
        {/* Intégration du composant Cartogram */}
        <Cartogram geoUrls={geoUrls} />
      </div>
    </div>
  );
};
 
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  window: {
    width: "100vw",
    height: "100vh",
    backgroundColor: "#ffffff",
    
    
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default App;
