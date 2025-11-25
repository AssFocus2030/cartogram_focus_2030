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
  const [baseProjection, setBaseProjection] = useState<any>(null); // projection fixe pour le graticule
  
  // Stockage des interpolations pré-calculées
  const interpolationsRef = useRef<{
    forward: Array<(t: number) => string>;  // 0 -> 1
    backward: Array<(t: number) => string>; // 1 -> 0
  } | null>(null);

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

  // Pré-calcul des interpolations Flubber au chargement
  useEffect(() => {
    if (geoData.length !== 2 || !svgRef.current) return;

    const width = svgRef.current.clientWidth || window.innerWidth;
    const height = svgRef.current.clientHeight || window.innerHeight;

    // Créer les projections pour chaque carte
    const projection0 = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[0]
    );
    const projection1 = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[1]
    );

    const path0 = d3.geoPath().projection(projection0);
    const path1 = d3.geoPath().projection(projection1);

    const from = geoData[0].features;
    const to = geoData[1].features;
    const maxLen = Math.max(from.length, to.length);

    // Feature vide pour padding
    const dummy = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      properties: {},
    };

    const fromPadded = [...from, ...Array(maxLen - from.length).fill(dummy)];
    const toPadded = [...to, ...Array(maxLen - to.length).fill(dummy)];

    // Générer tous les paths
    const paths0 = fromPadded.map((f) => path0(f) as string);
    const paths1 = toPadded.map((f) => path1(f) as string);

    // Pré-calculer toutes les interpolations
    console.log("🔄 Pré-calcul des interpolations Flubber...");
    const forwardInterpolations = paths0.map((p0, i) => 
      flubber.interpolate(p0, paths1[i])
    );
    const backwardInterpolations = paths1.map((p1, i) => 
      flubber.interpolate(p1, paths0[i])
    );

    interpolationsRef.current = {
      forward: forwardInterpolations,
      backward: backwardInterpolations,
    };
    console.log("✅ Interpolations pré-calculées !");
  }, [geoData]);

  

  /** --- DESSIN DE LA CARTE --- */
  const drawMap = (animateColors = true) => {
    if (geoData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll(".geo").remove(); // ❗ supprime seulement les pays
    svg.selectAll(".legend").remove(); // ❗ mais garde le graticule

    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    // --- Projection spécifique au GeoJSON pour le fitExtent
    const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[currentIndex]
    );
    const path = d3.geoPath().projection(projection);

    // --- Crée le fond blanc une seule fois ---
    if (svg.selectAll(".background").empty()) {
      svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#ffffffff");
    }

    // --- Crée le graticule UNE FOIS ---
    if (!baseProjection) {
      const proj = d3.geoProjection(geoLarriveeRaw).fitExtent(
        [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
        geoData[0]
      );
      setBaseProjection(() => proj);
      const pathBase = d3.geoPath().projection(proj);
      const graticule = d3.geoGraticule10();
      svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("fill", "none")
        .attr("stroke", "#ccccccff")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "2,2")
        .attr("d", pathBase as any);
    }

    // --- Échelles de couleur ---
    const thresholds = [20, 50, 100, 300];
    const colorScale = d3.scaleThreshold<number, string>()
      .domain(thresholds)
      .range([
        "#e9eff9",
        "#c1d1ed",
        "#7ea5d8",
        "#448cca",
        "#0471b0ff",
      ]);

    const fillColor = (d: any) => {
      // France en gris clair car non pertinente dans l'étude
      if (d.properties.ADM0_A3 === "FRA") return "#dededeff";
      
      const current = d.properties.current ?? 0;
      const pop = d.properties.POP_EST ?? 0;
      if (!pop || pop <= 0) return "#e0e0e0";
      const perMillion = (current / pop) * 1e6;
      return colorScale(perMillion);
    };

    const strokeColor = (d: any) =>
      showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)
        ? "#e05a55ff"
        : showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)
        ? "#55994aff"
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

    // --- Glow ---
    const defs = svg.select("defs").empty()
      ? svg.append("defs")
      : svg.select("defs");

    if (defs.select("#inner-glow").empty()) {
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
    }

    // --- Dessin des pays ---
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

    // --- Tooltip ---
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
          .attr("fill-opacity", 1);
        tooltip.style("display", "none");
      })
      .on("click", (_, d: any) => setSelectedCountry(d.properties));

    // --- Légende ---
    const legendData = [0, 20, 50, 100, 300];
    const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(20, 30)`);
    const legendYOffset = 6;

    legend.selectAll("rect")
      .data(legendData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (_, i) => i * 22 + legendYOffset)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", (d) => colorScale(d + 0.001))
      .attr("stroke", "#ffffffff");

    legend.selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", 26)
      .attr("y", (_, i) => i * 22 + 13 + legendYOffset)
      .style("font-size", "13px")
      .style("fill", "#646464ff")
      .style("font-weight", 390)
      .text((d, i) =>
        i < legendData.length - 1 ? `${d}–${legendData[i + 1]}` : `>${d}`
      );

    legend.append("text")
      .attr("x", 0)
      .attr("y", -6)
      .style("font-size", "15px")
      .style("font-weight", 350)
      .style("fill", "#201a1aff")
      .text("Mentions dans la presse pour 1 million d'habitants");
  };

  useEffect(() => {
    drawMap(true);
    const handleResize = () => drawMap(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex, baseProjection]);

  useEffect(() => drawMap(true), [showPMA, showAfrica, showIndia, showEurope]);

  /** --- TRANSITION ENTRE CARTES --- */
  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex || !interpolationsRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
      [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
      geoData[index]
    );

    const path = d3.geoPath().projection(projection);
    const to = geoData[index].features;
    const maxLen = Math.max(geoData[0].features.length, geoData[1].features.length);
    const dummy = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      properties: {},
    };
    const toPadded = [...to, ...Array(maxLen - to.length).fill(dummy)];
    const toPaths = toPadded.map((f) => path(f) as string);
    
    // Utiliser les interpolations pré-calculées
    const interpolations = index === 1 
      ? interpolationsRef.current.forward 
      : interpolationsRef.current.backward;

    const paths = svg.selectAll("path.geo").data(toPaths);

    paths.join("path")
      .attr("class", "geo")
      .transition()
      .duration(1000)
      .attrTween("d", (_, i) => interpolations[i]);

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
          zIndex: 1000,
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
          <CountryChart
            countryData={selectedCountry}
            allCountriesData={geoData[currentIndex]?.features.map((f: any) => f.properties) || []}
          />
        </Box>
      )}
    </div>
  );
};

export default Cartogram;
