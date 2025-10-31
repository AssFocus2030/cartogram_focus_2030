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

  useEffect(() => {
    setShowPMA(true);
  }, []);

  // 🧩 Normalisation des MultiPolygons
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

  // 🗺️ Chargement des GeoJSONs
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

    // 🟢 🔧 Modification : marges calculées à partir des données pays uniquement
    const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[currentIndex]
    );

    const path = d3.geoPath().projection(projection);

    // 🟡 Fond
    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#ffffffff");

    // 🟢 Graticule (peut être coupé)
    const graticule = d3.geoGraticule10();
    svg
      .append("path")
      .datum(graticule)
      .attr("fill", "none")
      .attr("stroke", "#ccccccff")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")
      .attr("d", path as any);

    const countries = svg
      .selectAll("path.geo")
      .data(geoData[currentIndex].features)
      .join("path")
      .attr("class", "geo")
      .attr("d", path as any)
      .attr("stroke-width", 1)
      .attr("stroke", "white");

    // 🎨 Couleurs selon zones
    const fillColor = (d: any) =>
      showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)
        ? "#ec6f64"
        : showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)
        ? "#91c481"
        : showIndia && d.properties.ADM0_A3 === INDIA_A3
        ? "#d092aa"
        : showEurope && EUROPE_A3.includes(d.properties.ADM0_A3)
        ? "#ffda93"
        : "#74aed6ff";

    const strokeColor = (d: any) =>
      showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)
        ? "#ba2f33ff"
        : showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)
        ? "#155c22ff"
        : showIndia && d.properties.ADM0_A3 === INDIA_A3
        ? "#aa1f62"
        : showEurope && EUROPE_A3.includes(d.properties.ADM0_A3)
        ? "#ab8533ff"
        : "white";

    // 🌈 Animation douce des couleurs
    countries.each(function (d: any) {
      const country = d3.select(this);
      const prevColor = country.attr("fill") || "#74aed6ff";
      const newColor = fillColor(d);
      const interpFill = d3.interpolateRgb(prevColor, newColor);
      const prevStroke = country.attr("stroke") || "white";
      const newStroke = strokeColor(d);
      const interpStroke = d3.interpolateRgb(prevStroke, newStroke);
      if (animateColors) {
        country
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attrTween("fill", () => (t) => interpFill(t))
          .attrTween("stroke", () => (t) => interpStroke(t));
      } else {
        country.attr("fill", newColor).attr("stroke", newStroke);
      }
    });

    // 🧭 Interaction
    countries
      .on("mouseover", function (_event: any, d: any) {
        const iso = d.properties.ADM0_A3;
        svg.selectAll("path.geo")
          .filter((f: any) => f.properties.ADM0_A3 === iso)
          .attr("stroke-width", 2)
          .attr("fill-opacity", 0.4);

        const p = d.properties;
        const name = p.NAME_FR || p.NAMEfr || "Inconnu";
        const isFrance = p.ADM0_A3 === "FRA";
        const current = isFrance ? "non renseigné" : (p.current ?? 0).toLocaleString();
        const pop = isFrance ? "non renseigné" : (p.POP_EST ?? 0);
        const ratio = isFrance ? "non renseigné" : pop ? (p.current ?? 0) / pop : 0;

        tooltip
          .style("display", "block")
          .html(`
            <span style="font-size:14px; color:#4A919E; font-weight:bold;">${name}</span><br/>
            Mentions dans la presse : <strong>${current}</strong><br/>
            Mentions / 1M hab. : <strong>${
              ratio === "non renseigné" ? ratio : Math.round(ratio * 1e6)
            }</strong>
          `);
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
        const iso = d.properties.ADM0_A3;
        svg.selectAll("path.geo")
          .filter((f: any) => f.properties.ADM0_A3 === iso)
          .attr("stroke-width", 1)
          .attr("fill-opacity", 1);
        tooltip.style("display", "none");
      })
      .on("click", function (_, d: any) {
        setSelectedCountry(d.properties);
      });
  };

  // 🌍 Mise à jour
  useEffect(() => {
    drawMap(false);
    const handleResize = () => drawMap(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex]);

  useEffect(() => {
    drawMap(true);
  }, [showPMA, showAfrica, showIndia, showEurope]);

  // 🌀 Morphing entre cartes
  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    // 🔧 Même correction appliquée ici
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

    paths
      .join("path")
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
    boxShadow: 0.5,
  }}
>
  <img
    src="/logo.webp"
    alt="Logo"
    style={{
      height: 28,
      width: "auto",
      display: "block",
    }}
  />
</Box>

      {/* 🔘 Map Toggle */}
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
          onShowPMA={() => {
            setShowPMA(true);
            setShowAfrica(false);
            setShowIndia(false);
            setShowEurope(false);
          }}
          onShowAfrica={() => {
            setShowPMA(false);
            setShowAfrica(true);
            setShowIndia(false);
            setShowEurope(false);
          }}
          onShowIndia={() => {
            setShowPMA(false);
            setShowAfrica(false);
            setShowIndia(true);
            setShowEurope(false);
          }}
          onShowEurope={() => {
            setShowPMA(false);
            setShowAfrica(false);
            setShowIndia(false);
            setShowEurope(true);
          }}
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
