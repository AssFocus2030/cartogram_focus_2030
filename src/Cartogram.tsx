import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as flubber from "flubber";
import { geoBertin1953 } from "d3-geo-projection";
import MapToggle from "./MapToggle";
import { Box, IconButton, Collapse, Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

type GeoJSONType = any;

interface CartogramProps {
  geoUrls: string[];
}

const Cartogram: React.FC<CartogramProps> = ({ geoUrls }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSONType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  /** 🔹 Normalise le GeoJSON pour n’avoir que des Polygons */
  const normalizeGeoJSON = (geo: GeoJSONType) => {
    const features: any[] = [];
    geo.features.forEach((f: any) => {
      if (f.geometry.type === "Polygon") {
        features.push(f);
      } else if (f.geometry.type === "MultiPolygon") {
        f.geometry.coordinates.forEach((coords: any) => {
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: coords },
            properties: f.properties
          });
        });
      }
    });
    return { type: "FeatureCollection", features };
  };

  /** 🔹 Charge tous les GeoJSON */
  useEffect(() => {
    const fetchAllGeo = async () => {
      try {
        const allData = await Promise.all(
          geoUrls.map(async url => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} pour ${url}`);
            const json = await res.json();
            return normalizeGeoJSON(json);
          })
        );
        setGeoData(allData);
      } catch (err) {
        console.error("Erreur lors du chargement des GeoJSON :", err);
      }
    };
    fetchAllGeo();
  }, [geoUrls]);

  /** 🔹 Fonction principale de dessin de la carte */
  const drawMap = () => {
    if (geoData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = geoBertin1953().fitSize([width, height], geoData[0]);
    const path = d3.geoPath().projection(projection);

    const graticule = d3.geoGraticule();
    svg.append("path")
      .datum(graticule())
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")
      .attr("d", path as any);

    const values = geoData[currentIndex].features
      .map((f: any) => f.properties.current / f.properties.POP_EST)
      .filter((v: number) => !isNaN(v) && isFinite(v));

    const nbClasses = 5;
    const colorScale = d3.scaleQuantile<string>()
      .domain(values)
      .range(["#feebe9ff", "#fccfcaff", "#faaea6ff", "#f38375", "#ef6351"]);

    const breaks = colorScale.quantiles();

    // --- 🔹 Dessin des pays avec tooltip conditionnel pour la France ---
    svg.selectAll("path.geo")
      .data(geoData[currentIndex].features)
      .join("path")
      .attr("class", "geo")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const ratio = d.properties.current / d.properties.POP_EST;
        return isFinite(ratio) ? colorScale(ratio) : "#ccc";
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", function (_: any, d: any) {
        const p = d.properties;
        const name = p.NAME_FR || p.NAMEfr || "Inconnu";
        const current = p.current ?? 0;
        const pop = p.POP_EST ?? 0;
        const ratio = pop ? current / pop : 0;

        d3.select(this)
          .attr("stroke", "white")
          .attr("stroke-width", 2)
          .attr("fill-opacity", 0.4);

        if (name.toLowerCase().includes("france")) {
          tooltip
            .style("display", "block")
            .html(`
              <span style="font-size:16px; color: #ef6351; font-weight:bold;">${name}</span><br/>
              Mentions dans la presse : <strong>Non renseigné</strong><br/>
              Population : <strong>${pop.toLocaleString()}</strong><br/>
              Nombre de mentions par million d'habitant : <strong>Non renseigné</strong>
            `);
        } else {
          tooltip
            .style("display", "block")
            .html(`
              <span style="font-size:16px; color: #ef6351; font-weight:bold;">${name}</span><br/>
              Mentions dans la presse : <strong>${current.toLocaleString()}</strong><br/>
              Population : <strong>${pop.toLocaleString()}</strong><br/>
              Nombre de mentions par million d'habitant : <strong>${(ratio * 1e6).toFixed(2)}</strong> / 1M hab.
            `);
        }
      })
      .on("mousemove", event => {
        tooltip
          .style("position", "fixed")
          .style("left", event.clientX + 5 + "px")
          .style("top", event.clientY + 5 + "px");
      })
      .on("mouseout", function (_: any, d: any) {
        const ratio = d.properties.current / d.properties.POP_EST;
        d3.select(this)
          .attr("fill", isFinite(ratio) ? colorScale(ratio) : "#ccc")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("fill-opacity", 1);

        tooltip.style("display", "none");
      });

    // --- 🔹 Légende responsive ---
    const legendWidth = width * 0.15;
    const legendHeight = height * 0.015;
    const legendX = width * 0.8;
    const legendY = height * 0.06;

    const titleLines = [
      "Nombre de mentions dans la presse",
      "par millions d'habitant"
    ];
    const fontSizeTitle = Math.max(14, height * 0.014);
    const lineHeight = 1.3;

    const legend = svg.append("g").attr("transform", `translate(${legendX}, ${legendY})`);

    legend.selectAll("text.title")
      .data(titleLines)
      .join("text")
      .attr("class", "title")
      .attr("x", 0)
      .attr("y", (_, i) => -lineHeight * fontSizeTitle + i * fontSizeTitle * lineHeight)
      .attr("font-size", fontSizeTitle)
      .attr("fill", "#666")
      .text(d => d);

    const legendData = d3.range(nbClasses).map(i => ({
      color: colorScale.range()[i]
    }));

    legend.selectAll("rect")
      .data(legendData)
      .join("rect")
      .attr("x", (_, i) => i * (legendWidth / nbClasses))
      .attr("y", legendHeight * 0.3)
      .attr("width", legendWidth / nbClasses)
      .attr("height", legendHeight)
      .attr("fill", d => d.color)
      .attr("stroke", "#fff");

    const limits = [d3.min(values)!, ...breaks];
    legend.selectAll("text.value")
      .data(limits)
      .join("text")
      .attr("class", "value")
      .attr("x", (_, i) => i * (legendWidth / nbClasses))
      .attr("y", legendHeight + height * 0.025)
      .attr("font-size", Math.max(12, height * 0.012))
      .attr("fill", "#666")
      .attr("text-anchor", "start")
      .text((d, i) => {
        const value = Math.round(Number(d) * 1e6).toLocaleString("fr-FR");
        if (i === 0) return value;
        if (i === limits.length - 1) return `${value} et supérieur`;
        return value;
      });
  };

  /** 🔹 Redessine à chaque changement ou redimensionnement */
  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex]);

  /** 🔹 Animation fluide entre cartes avec flubber */
  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;
    const projection = geoBertin1953().fitSize([width, height], geoData[0]);
    const path = d3.geoPath().projection(projection);

    const fromFeatures = geoData[currentIndex].features;
    const toFeatures = geoData[index].features;

    const maxLen = Math.max(fromFeatures.length, toFeatures.length);
    const dummyPolygon = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      properties: {}
    };

    const fromPadded = [...fromFeatures];
    const toPadded = [...toFeatures];
    while (fromPadded.length < maxLen) fromPadded.push(dummyPolygon);
    while (toPadded.length < maxLen) toPadded.push(dummyPolygon);

    const fromPaths = fromPadded.map(f => path(f) as string);
    const toPaths = toPadded.map(f => path(f) as string);

    const paths = svg.selectAll("path.geo").data(toPaths);
    paths
      .join("path")
      .attr("class", "geo")
      .transition()
      .duration(1500)
      .attrTween("d", (_, i) => flubber.interpolate(fromPaths[i], toPaths[i]));

    setTimeout(() => setCurrentIndex(index), 1500);
  };

  /** 🔹 Rendu principal */
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />

      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          backgroundColor: "white",
          color: "black",
          padding: "6px 10px",
          display: "none",
          fontSize: "12px",
          fontWeight: 500,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          borderRadius: 0,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      />

      {/* Box MUI d'information en bas à droite */}
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: "15vw",
          minWidth: "200px",
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          p: 1,
          zIndex: 1000,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={0.5}>
            <InfoIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" color="textSecondary">
              Information sur le cartogram
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setInfoOpen(prev => !prev)}>
            {infoOpen ? "−" : "+"}
          </IconButton>
        </Box>
        <Collapse in={infoOpen}>
          <Typography variant="body2" mt={1}>
            L’enjeu du cartogramme (ou anamorphose, c’est à dire déformation) est de rendre compte d’un phénomène en déformant les surfaces des entités d’un fond de carte, tout en conservant suffisamment leur forme pour qu’elles soient lisibles.
          </Typography>
        </Collapse>
      </Box>

      {/* Box source en bas à gauche */}
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          left: 20,
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          p: 1,
          zIndex: 1000,
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Source : FOCUS 2030
        </Typography>
      </Box>

      {/* Bouton MapToggle en haut à gauche */}
      <div
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          background: "white",
          padding: 5,
          borderRadius: 4,
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <MapToggle
          checked={currentIndex === 1}
          onChange={(checked) => changeMap(checked ? 1 : 0)}
        />
      </div>
    </div>
  );
};

export default Cartogram;
