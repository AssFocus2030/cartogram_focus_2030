import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as flubber from "flubber";
// @ts-ignore
import { geoLarriveeRaw } from "d3-geo-projection";

import MapToggle from "./MapToggle.tsx";
import CountryChart from "./CountryChart";
import { Box, Typography, Button } from "@mui/material";

import { africanISO_A3 } from "./africanCountries.ts";
import { PMACountriesISO_A3 } from "./PMAcountries.ts";

type GeoJSONType = any;

interface CartogramProps {
  geoUrls: string[];
}

const INDIA_A3 = "IND";
const EUROPE_A3 = [
  "ALB","AND","AUT","BLR","BEL","BIH","BGR","HRV","CYP","CZE","DNK",
  "EST","FIN","DEU","GRC","HUN","ISL","IRL","ITA","LVA","LTU","LUX","MLT",
  "MDA","MNE","NLD","MKD","NOR","POL","PRT","ROU","SMR","SRB","SVK","SVN",
  "ESP","SWE","CHE","GBR","UKR","VAT","MCO",
];

const Cartogram: React.FC<CartogramProps> = ({ geoUrls }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSONType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPMA, setShowPMA] = useState(true);
  const [showAfrica, setShowAfrica] = useState(false);
  const [showIndia, setShowIndia] = useState(false);
  const [showEurope, setShowEurope] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);

  useEffect(() => setShowPMA(true), []);

  const normalizeGeoJSON = (geo: GeoJSONType) => {
    const features: any[] = [];
    geo.features.forEach((f: any) => {
      if (f.properties.ADM0_A3 === "ATA") return;
      if (f.geometry.type === "Polygon") features.push(f);
      else if (f.geometry.type === "MultiPolygon") {
        f.geometry.coordinates.forEach((coords: any) =>
          features.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: coords },
            properties: f.properties,
          })
        );
      }
    });
    return { type: "FeatureCollection", features };
  };

  useEffect(() => {
    const fetchAllGeo = async () => {
      try {
        const allData = await Promise.all(
          geoUrls.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
            const json = await res.json();
            return normalizeGeoJSON(json);
          })
        );
        setGeoData(allData);
      } catch (err) {
        console.error("Erreur chargement GeoJSON :", err);
      }
    };
    fetchAllGeo();
  }, [geoUrls]);

  const drawMap = (animateColors = true) => {
    if (geoData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[currentIndex]
    );
    const path = d3.geoPath().projection(projection);

    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "#ffffffff");

    const graticule = d3.geoGraticule10();
    svg.append("path")
      .datum(graticule)
      .attr("fill", "none")
      .attr("stroke", "#ccccccff")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")
      .attr("d", path as any);

    // 🔹 Choropleth scale
    const thresholds = [20, 50, 100, 300];
    const colorScale = d3.scaleThreshold<number, string>()
      .domain(thresholds)
      .range([
        "#e9eff9", // 0–20
        "#c1d1ed", // 20–50
        "#7ea5d8", // 50–100
        "#448cca", // 100–300
        "#0471b0ff", // >300
      ]);

    const fillColor = (d: any) => {
      const current = d.properties.current ?? 0;
      const pop = d.properties.POP_EST ?? 0;
      if (!pop || pop <= 0) return "#e0e0e0";
      const perMillion = (current / pop) * 1e6;
      return colorScale(perMillion);
    };

    // 🔹 Stroke color & width
    const strokeColor = (d: any) =>
      showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)
        ? "#e05a55ff"
        : showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)
        ? "#638f6bff"
        : showIndia && d.properties.ADM0_A3 === INDIA_A3
        ? "#ba5887ff"
        : showEurope && EUROPE_A3.includes(d.properties.ADM0_A3)
        ? "#fdc54a"
        : "white";

    const strokeWidth = (d: any) =>
      (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
      (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
      (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
      (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3))
        ? 1
        : 1;

    // 🔹 Définition glow filter
    const defs = svg.append("defs");
    const glowFilter = defs.append("filter")
      .attr("id", "inner-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "blur");
    glowFilter.append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .enter()
      .append("feMergeNode")
      .attr("in", d => d);

    // 🔹 Draw countries
    const countries = svg.selectAll("path.geo")
      .data(geoData[currentIndex].features)
      .join("path")
      .attr("class", "geo")
      .attr("d", path as any)
      .attr("fill", fillColor)
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .attr("stroke-linejoin", "round");

    if (animateColors) {
      countries.transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("stroke", (d: any) => strokeColor(d))
        .attr("stroke-width", (d: any) => strokeWidth(d))
        .attr("filter", (d: any) => {
          if (
            (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
            (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
            (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
            (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3))
          ) return "url(#inner-glow)";
          return null;
        });
    }

    // 🔹 Tooltip
    const uniqueCountries = Array.from(
      new Map(
        geoData[currentIndex].features.map((f: { properties: { ADM0_A3: any } }) => [f.properties.ADM0_A3, f])
      ).values()
    ) as any[];
    const totalWithoutFrance = d3.sum(
      uniqueCountries
        .filter((f: any) => f.properties.ADM0_A3 !== "FRA" && f.properties.ADM0_A3 !== "NOM")
        .map((f: any) => f.properties.current ?? 0)
    );

    countries
  .on("mouseover", function (_event: any, d: any) {
    const iso = d.properties.ADM0_A3;
    svg.selectAll("path.geo")
      .filter((f: any) => f.properties.ADM0_A3 === iso)
      .attr("stroke-width", 3)
      .attr("fill-opacity", 0.6);

    const p = d.properties;

    // Affiche "Non renseigné" pour la France, sinon les données normales
    let tooltipContent;
    if (p.ADM0_A3 === "FRA") {
      tooltipContent = `
        <span style="font-size:14px; color:#2383c4; font-weight:bold;">France</span><br/>
        Mentions : <strong>Non renseigné</strong><br/>
        Mentions / 1M hab. : <strong>Non renseigné</strong><br/>
        Part du total : <strong>Non renseigné</strong>
      `;
    } else {
      const name = p.NAME_FR || p.NAMEfr || "Inconnu";
      const current = p.current ?? 0;
      const pop = p.POP_EST ?? 0;
      const ratio = pop ? (current / pop) * 1e6 : 0;
      const percentage = totalWithoutFrance ? (current / totalWithoutFrance) * 100 : 0;

      tooltipContent = `
        <span style="font-size:14px; color:#2383c4; font-weight:bold;">${name}</span><br/>
        Mentions : <strong>${current.toLocaleString()}</strong><br/>
        Mentions / 1M hab. : <strong>${Math.round(ratio)}</strong><br/>
        Part du total : <strong>${percentage.toFixed(2)}%</strong>
      `;
    }

    tooltip.style("display", "block").html(tooltipContent);
  })

      .on("mousemove", (event) => {
        const tooltipNode = tooltipRef.current;
        if (!tooltipNode) return;
        const margin = 10;
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;
        let left = event.clientX + margin;
        let top = event.clientY + margin;
        if (left + tooltipWidth > window.innerWidth - margin)
          left = event.clientX - tooltipWidth - margin;
        if (top + tooltipHeight > window.innerHeight - margin)
          top = event.clientY - tooltipHeight - margin;
        tooltip.style("left", left + "px").style("top", top + "px");
      })
      .on("mouseout", function (_, d: any) {
        svg.selectAll("path.geo")
          .filter((f: any) => f.properties.ADM0_A3 === d.properties.ADM0_A3)
          .transition()
          .duration(300)
          .attr("stroke-width", strokeWidth(d))
          .attr("fill-opacity", 1)
          .attr("filter", (d: any) => {
            if (
              (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
              (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
              (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
              (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3))
            ) return "url(#inner-glow)";
            return null;
          });
        tooltip.style("display", "none");
      })
      .on("click", (_, d: any) => setSelectedCountry(d.properties));


    // 🔹 Choropleth legend
const legendData = [0, 20, 50, 100, 300];
// Changer la position ici
const legend = svg.append("g").attr("transform", `translate(20, 30)`);
const legendYOffset = 6; // espace sous le titre

    legend.selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (_, i) => i * 22+ legendYOffset)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", (d) => colorScale(d + 0.001))
      .attr("stroke", "#ffffffff");
    
      // Texte des valeurs
legend.selectAll("text")
  .data(legendData)
  .enter()
  .append("text")
  .attr("x", 26)
  .attr("y", (_, i) => i * 22 + 13 + legendYOffset)
  .style("font-size", "12px")
  .style("fill", "#646464ff") // couleur claire
  .style("font-weight", 350) // light
  .text((d, i) =>
    i < legendData.length - 1 ? `${d}–${legendData[i + 1]}` : `>${d}`
  );

// Titre de la légende
legend.append("text")
  .attr("x", 0)
  .attr("y", -6)
  .style("font-size", "14px")
  
  .style("font-weight", 400) // light
  .style("fill", "#201a1aff") // couleur claire
  .text("Mentions dans la presse pour 1 million d'habitants");

  };

  useEffect(() => {
    drawMap(true);
    const handleResize = () => drawMap(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex]);

  useEffect(() => drawMap(true), [showPMA, showAfrica, showIndia, showEurope]);

  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[index]
    );

    const path = d3.geoPath().projection(projection);
    const from = geoData[currentIndex].features;
    const to = geoData[index].features;
    const maxLen = Math.max(from.length, to.length);
    const dummy = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      properties: {},
    };
    const fromPadded = [...from, ...Array(maxLen - from.length).fill(dummy)];
    const toPadded = [...to, ...Array(maxLen - to.length).fill(dummy)];
    const fromPaths = fromPadded.map((f) => path(f) as string);
    const toPaths = toPadded.map((f) => path(f) as string);
    const paths = svg.selectAll("path.geo").data(toPaths);

    paths.join("path")
      .attr("class", "geo")
      .transition()
      .duration(1000)
      .attrTween("d", (_, i) => flubber.interpolate(fromPaths[i], toPaths[i]));

    setTimeout(() => setCurrentIndex(index), 1000);
  };

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
          padding: "4px 8px",
          display: "none",
          fontSize: "11px",
          fontWeight: 500,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          borderRadius: 4,
          zIndex: 1001,
        }}
      />
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          left: 20,
          bgcolor: "white",
          borderRadius: 2,
          p: 1,
          zIndex: 1000,
          boxShadow: 0,
        }}
      >
        <img src="/logo.webp" alt="Logo" style={{ height: 28, width: "auto", display: "block" }} />
      </Box>

      <div
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          background: "transparent",
          padding: 0,
          borderRadius: 0,
          zIndex: 1,
          
        }}
      >
        <MapToggle
          checked={currentIndex === 1}
          onChange={(checked) => changeMap(checked ? 1 : 0)}
          onShowPMA={() => { setShowPMA(true); setShowAfrica(false); setShowIndia(false); setShowEurope(false); }}
          onShowAfrica={() => { setShowPMA(false); setShowAfrica(true); setShowIndia(false); setShowEurope(false); }}
          onShowIndia={() => { setShowPMA(false); setShowAfrica(false); setShowIndia(true); setShowEurope(false); }}
          onShowEurope={() => { setShowPMA(false); setShowAfrica(false); setShowIndia(false); setShowEurope(true); }}
        />
      </div>

      {selectedCountry && (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            left: 20,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            zIndex: 1002,
            minWidth: 320,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              {selectedCountry.NAME_FR || selectedCountry.NAMEfr || "Pays"}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedCountry(null)}
              sx={{
                borderRadius: "16px",
                borderColor: "#888",
                color: "#444",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "#555" },
              }}
            >
              Fermer
            </Button>
          </Box>
          <CountryChart countryData={selectedCountry} />
        </Box>
      )}
    </div>
  );
};

export default Cartogram;
