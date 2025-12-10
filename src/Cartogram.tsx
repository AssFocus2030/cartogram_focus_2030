import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// @ts-ignore
import { geoLarriveeRaw } from "d3-geo-projection";

import MapToggle from "./MapToggle.tsx";
import CountryChart from "./CountryChart";
import Top5Countries from "./Top5Countries";
import { Box, Typography, Button, IconButton } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";

import { africanISO_A3 } from "./africanCountries.ts";
import { PMACountriesISO_A3 } from "./PMAcountries.ts";

type GeoJSONType = any;

interface CartogramProps {
  geoUrls: string[];
  onIndexChange?: (index: number) => void;
}

const INDIA_A3 = "IND";
const EUROPE_A3 = [
  "ALB","AND","AUT","BLR","BEL","BIH","BGR","HRV","CYP","CZE","DNK",
  "EST","FIN","DEU","GRC","HUN","ISL","IRL","ITA","LVA","LTU","LUX","MLT",
  "MDA","MNE","NLD","MKD","NOR","POL","PRT","ROU","SMR","SRB","SVK","SVN",
  "ESP","SWE","CHE","GBR","UKR","VAT","MCO",
];

const Cartogram: React.FC<CartogramProps> = ({ geoUrls, onIndexChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSONType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPMA, setShowPMA] = useState(true);
  const [showAfrica, setShowAfrica] = useState(false);
  const [showIndia, setShowIndia] = useState(false);
  const [showEurope, setShowEurope] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [showTop5, setShowTop5] = useState(false);
  const [baseProjection] = useState<any>(null); // projection fixe pour le graticule
  const [zoomTransform, setZoomTransform] = useState<any>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<any>(null);
  const isTransitioning = useRef(false);
  const isDraggingWipe = useRef(false);
  const wipePosition = useRef(0); // Position du wipe (0 = carte A, 1 = carte B)

  useEffect(() => setShowPMA(true), []);

  const normalizeGeoJSON = (geo: GeoJSONType) => {
    const features: any[] = [];
    
    // Trier d'abord les features par ADM0_A3 pour avoir un ordre cohérent
    const sortedFeatures = [...geo.features].sort((a, b) => {
      const idA = a.properties.ADM0_A3 || "";
      const idB = b.properties.ADM0_A3 || "";
      return idA.localeCompare(idB);
    });
    
    sortedFeatures.forEach((f: any) => {
      if (f.properties.ADM0_A3 === "ATA") return;
      if (f.geometry.type === "Polygon") {
        features.push(f);
      }
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
    
    // Attribuer un index global à chaque feature après le tri
    features.forEach((f, index) => {
      f.properties._globalIndex = index;
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

    // --- Configuration du zoom ---
    if (!zoomBehaviorRef.current) {
      const zoom = d3.zoom()
        .scaleExtent([1, 12])
        .on("zoom", (event) => {
          setZoomTransform(event.transform);
        });
      
      zoomBehaviorRef.current = zoom;
      svg.call(zoom as any);
    }

    // Créer un groupe pour les éléments zoomables
    let zoomGroup = svg.select<SVGGElement>(".zoom-group");
    if (zoomGroup.empty()) {
      zoomGroup = svg.append("g").attr("class", "zoom-group");
    }
    zoomGroup.attr("transform", zoomTransform.toString());

    // Calculer la largeur de stroke en fonction du zoom
    const currentScale = zoomTransform.k;
    const baseStrokeWidth = 1 / currentScale;
    const highlightStrokeWidth = 1  / currentScale;

    // --- Échelles de couleur ---
    const thresholds = [20, 50, 80, 300];
    const colorScale = d3.scaleThreshold<number, string>()
      .domain(thresholds)
      .range([
           "#eff3ff",
        "#bdd7e7",
        "#6baed6",
        "#3182bd",
        "#08519c",
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
        ? "#5e9256ff"
        : showIndia && d.properties.ADM0_A3 === INDIA_A3
        ? "#ba5887ff"
        : showEurope && EUROPE_A3.includes(d.properties.ADM0_A3)
        ? "#fdc54a"
        : "white";

    // --- Créer le filtre Glow ---
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

    // Créer des groupes séparés pour chaque carte
    if (geoData.length === 2) {
      // Groupe pour la carte 0
      let zoomGroup0 = svg.select<SVGGElement>(".zoom-group-0");
      if (zoomGroup0.empty()) {
        zoomGroup0 = svg.insert("g", ".zoom-group").attr("class", "zoom-group-0");
      }
      zoomGroup0.attr("transform", zoomTransform.toString());
      
      // Groupe pour la carte 1
      let zoomGroup1 = svg.select<SVGGElement>(".zoom-group-1");
      if (zoomGroup1.empty()) {
        zoomGroup1 = svg.insert("g", ".zoom-group").attr("class", "zoom-group-1");
      }
      zoomGroup1.attr("transform", zoomTransform.toString());
      
      // Dessiner les deux cartes (ordre inversé : carte 1 puis carte 0)
      [1, 0].forEach(idx => {
        const targetGroup = svg.select(`.zoom-group-${idx}`);
        const targetData = geoData[idx];
        
        const projection = d3.geoProjection(geoLarriveeRaw).fitExtent(
          [[width * 0.05, height * 0.05], [width * 0.95, height * 0.95]],
          targetData
        );
        const pathGen = d3.geoPath().projection(projection);
        
        targetGroup.selectAll("path.geo").remove();
        
        const countries = targetGroup.selectAll("path.geo")
          .data(targetData.features, (d: any) => d.properties._globalIndex)
          .join("path")
          .attr("class", "geo")
          .attr("d", pathGen as any)
          .attr("fill", fillColor)
          .attr("stroke", "white")
          .attr("stroke-width", baseStrokeWidth)
          .attr("stroke-linejoin", "round");

        // Appliquer les animations de couleur pour les pays spéciaux
        if (animateColors) {
          countries.transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .attr("stroke", (d: any) => strokeColor(d))
            .attr("stroke-width", (d: any) => {
              const isHighlighted = (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
                (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
                (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
                (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3));
              return isHighlighted ? highlightStrokeWidth : baseStrokeWidth;
            })
            .attr("filter", (d: any) => {
              if (
                (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
                (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
                (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
                (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3))
              ) return "url(#inner-glow)";
              return null;
            });
        } else {
          // Appliquer immédiatement sans animation
          countries
            .attr("stroke", (d: any) => strokeColor(d))
            .attr("stroke-width", (d: any) => {
              const isHighlighted = (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
                (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
                (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
                (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3));
              return isHighlighted ? highlightStrokeWidth : baseStrokeWidth;
            })
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

        // --- Tooltip et interactions ---
        const uniqueCountries = Array.from(
          new Map(
            targetData.features.map((f: { properties: { ADM0_A3: any } }) => [f.properties.ADM0_A3, f])
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
              .attr("stroke-width", 3 / currentScale)
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
            const isHighlighted = (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
              (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
              (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
              (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3));
            
            svg.selectAll("path.geo")
              .filter((f: any) => f.properties.ADM0_A3 === d.properties.ADM0_A3)
              .transition()
              .duration(300)
              .attr("stroke-width", isHighlighted ? highlightStrokeWidth : baseStrokeWidth)
              .attr("fill-opacity", 1);
            tooltip.style("display", "none");
          })
          .on("click", (_, d: any) => {
            setSelectedCountry(d.properties);
            setIsChartVisible(false);
            setTimeout(() => setIsChartVisible(true), 10);
          });
      });
      
      // --- Légende (à afficher même avec le wipe) ---
      const legendData = [0, 20, 50, 80, 300];
      const legend = svg.select(".legend");
      if (legend.empty()) {
        const newLegend = svg.append("g").attr("class", "legend").attr("transform", `translate(20, 30)`);
        const legendYOffset = 6;

        newLegend.selectAll("rect")
          .data(legendData)
          .enter()
          .append("rect")
          .attr("x", 0)
          .attr("y", (_, i) => i * 22 + legendYOffset)
          .attr("width", 18)
          .attr("height", 18)
          .attr("rx", 3)
          .attr("ry", 3)
          .attr("fill", (d) => colorScale(d + 0.001))
          .attr("stroke-width", 1.5);

        newLegend.selectAll("text")
          .data(legendData)
          .enter()
          .append("text")
          .attr("x", 26)
          .attr("y", (_, i) => i * 22 + 13 + legendYOffset)
          .style("font-size", "14px")
          .style("fill", "#646464ff")
          .style("font-weight", 390)
          .text((d, i) =>
            i < legendData.length - 1 ? `${d}–${legendData[i + 1]}` : `>${d}`
          );

        newLegend.append("text")
          .attr("x", 0)
          .attr("y", -6)
          .style("font-size", "15px")
          .style("font-weight", 380)
          .style("fill", "#201a1aff")
          .text("Mentions dans la presse pour 1 million d'habitants");
      }
      
      // Initialiser ou mettre à jour le wipe
      const initialX = wipePosition.current * width;
      updateWipeClip(initialX);
      
      return; // Sortir car on a déjà dessiné
    }

    // --- Dessin des pays ---
    const countries = zoomGroup.selectAll("path.geo")
      .data(geoData[currentIndex].features, (d: any) => d.properties._globalIndex)
      .join("path")
      .attr("class", "geo")
      .attr("d", path as any)
      .attr("fill", fillColor)
      .attr("stroke", "white")
      .attr("stroke-width", baseStrokeWidth)
      .attr("stroke-linejoin", "round");

    if (animateColors) {
      countries.transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("stroke", (d: any) => strokeColor(d))
        .attr("stroke-width", (d: any) => {
          const isHighlighted = (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
            (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
            (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
            (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3));
          return isHighlighted ? highlightStrokeWidth : baseStrokeWidth;
        })
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
          .attr("stroke-width", 3 / currentScale)
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
        const isHighlighted = (showPMA && PMACountriesISO_A3.includes(d.properties.ADM0_A3)) ||
          (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
          (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
          (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3));
        
        svg.selectAll("path.geo")
          .filter((f: any) => f.properties.ADM0_A3 === d.properties.ADM0_A3)
          .transition()
          .duration(300)
          .attr("stroke-width", isHighlighted ? highlightStrokeWidth : baseStrokeWidth)
          .attr("fill-opacity", 1);
        tooltip.style("display", "none");
      })
      .on("click", (_, d: any) => {
        setSelectedCountry(d.properties);
        setIsChartVisible(false);
        setTimeout(() => setIsChartVisible(true), 10);
      });

    // --- Légende ---
    const legendData = [0, 20, 50, 80, 300];
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
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", (d) => colorScale(d + 0.001))
      
      .attr("stroke-width", 1.5)
      

    legend.selectAll("text")
      .data(legendData)
      .enter()
      .append("text")
      .attr("x", 26)
      .attr("y", (_, i) => i * 22 + 13 + legendYOffset)
      .style("font-size", "14px")
      .style("fill", "#646464ff")
      .style("font-weight", 390)
      .text((d, i) =>
        i < legendData.length - 1 ? `${d}–${legendData[i + 1]}` : `>${d}`
      );

    legend.append("text")
      .attr("x", 0)
      .attr("y", -6)
      .style("font-size", "15px")
      .style("font-weight", 380)
      .style("fill", "#201a1aff")
      .text("Mentions dans la presse pour 1 million d'habitants");
  };

  useEffect(() => {
    drawMap(true);
    const handleResize = () => drawMap(false);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex, baseProjection, zoomTransform]);

  useEffect(() => drawMap(true), [showPMA, showAfrica, showIndia, showEurope]);

  /** --- TRANSITION ENTRE CARTES (WIPE EFFECT) --- */
  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;
    
    isTransitioning.current = true;
    const targetPosition = index; // 0 ou 1
    
    animateWipe(targetPosition);
  };

  const animateWipe = (targetPosition: number) => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    
    const startX = wipePosition.current * width;
    const endX = targetPosition * width;
    
    // Créer/mettre à jour le clipPath
    updateWipeClip(startX);
    
    // Animer
    svg.transition()
      .duration(1200)
      .ease(d3.easeCubicInOut)
      .tween("wipe", function() {
        const interpolate = d3.interpolate(startX, endX);
        return function(t) {
          const x = interpolate(t);
          updateWipeClip(x);
          wipePosition.current = x / width;
        };
      })
      .on("end", () => {
        isTransitioning.current = false;
        setCurrentIndex(targetPosition);
        if (onIndexChange) onIndexChange(targetPosition); // Informer le parent
      });
  };

  const updateWipeClip = (xPosition: number) => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    
    let defs = svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = svg.append("defs");
    }
    
    // Créer ou mettre à jour le clipPath pour la carte A (visible à gauche)
    let clipPathA = defs.select<SVGClipPathElement>("#wipe-clip-a");
    if (clipPathA.empty()) {
      clipPathA = defs.append("clipPath").attr("id", "wipe-clip-a");
      clipPathA.append("rect");
    }
    clipPathA.select("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", xPosition)
      .attr("height", "100%");
    
    // Créer ou mettre à jour le clipPath pour la carte B (visible à droite)
    let clipPathB = defs.select<SVGClipPathElement>("#wipe-clip-b");
    if (clipPathB.empty()) {
      clipPathB = defs.append("clipPath").attr("id", "wipe-clip-b");
      clipPathB.append("rect");
    }
    clipPathB.select("rect")
      .attr("x", xPosition)
      .attr("y", 0)
      .attr("width", width - xPosition)
      .attr("height", "100%");
    
    // Appliquer les clips aux groupes correspondants (inversé)
    svg.select(".zoom-group-1").attr("clip-path", "url(#wipe-clip-a)");
    svg.select(".zoom-group-0").attr("clip-path", "url(#wipe-clip-b)");
    
    // Créer la ligne de séparation
    let separatorLine = svg.select<SVGLineElement>(".wipe-separator");
    if (separatorLine.empty()) {
      separatorLine = svg.append("line")
        .attr("class", "wipe-separator")
        .attr("stroke", "#2383c4")
        .attr("stroke-width", 3)
        .style("pointer-events", "none")
        .style("cursor", "ew-resize");
    }
    separatorLine
      .attr("x1", xPosition)
      .attr("y1", 0)
      .attr("x2", xPosition)
      .attr("y2", "100%");
    
    // Créer la languette de préhension
    let wipeHandle = svg.select<SVGGElement>(".wipe-handle");
    if (wipeHandle.empty()) {
      wipeHandle = svg.append("g")
        .attr("class", "wipe-handle")
        .style("pointer-events", "none");
      
      // Cercle avec contour noir seulement
      wipeHandle.append("circle")
        .attr("class", "handle-circle")
        .attr("cx", 15)
        .attr("cy", 15)
        .attr("r", 12)
        .attr("fill", "white")
        .attr("stroke", "#0471b0ff")
        .attr("stroke-width", 2.5)
        .attr("opacity", 1);
      
  
    }
    
    // Positionner la languette au centre vertical
    const handleSize = 30;
    const yCenter = (svgRef.current?.clientHeight || window.innerHeight) / 2;
    wipeHandle.attr("transform", `translate(${xPosition - 15}, ${yCenter - handleSize / 2})`);
    
    // Zone de drag invisible
    let dragZone = svg.select<SVGRectElement>(".wipe-drag-zone");
    if (dragZone.empty()) {
      dragZone = svg.append("rect")
        .attr("class", "wipe-drag-zone")
        .attr("fill", "transparent")
        .attr("height", "100%")
        .style("cursor", "ew-resize")
        .call(d3.drag()
          .on("start", () => {
            isDraggingWipe.current = true;
            isTransitioning.current = true;
          })
          .on("drag", (event) => {
            const width = svgRef.current?.clientWidth || window.innerWidth;
            const newX = Math.max(0, Math.min(width, event.x));
            updateWipeClip(newX);
            wipePosition.current = newX / width;
          })
          .on("end", () => {
            isDraggingWipe.current = false;
            isTransitioning.current = false;
            const finalPosition = wipePosition.current > 0.5 ? 1 : 0;
            setCurrentIndex(finalPosition);
            if (onIndexChange) onIndexChange(finalPosition); // Informer le parent
            animateWipe(finalPosition);
          }) as any
        );
    }
    dragZone
      .attr("x", xPosition - 20)
      .attr("width", 40);
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

      {/* Boutons de zoom */}
      <Box
        sx={{
          position: "fixed",
          bottom: 80,
          left: 20,
          display: "flex",
          flexDirection: "column",
          gap: 0.8,
          zIndex: 1000,
        }}
      >
        {/* Bouton Top 5 */}
        <IconButton
          onClick={() => setShowTop5(true)}
          sx={{
            bgcolor: "#2383c4",
            
            boxShadow: 3,
            width: 36,
            height: 36,
            marginBottom: 1.5,
            "&:hover": { bgcolor: "#1c6ba0" },
          }}
        >
          <LeaderboardIcon sx={{ fontSize: 22, color: "white" }} />
        </IconButton>

        <IconButton
          onClick={() => {
            if (svgRef.current && zoomBehaviorRef.current) {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(300).call(
                zoomBehaviorRef.current.scaleBy as any,
                1.5
              );
            }
          }}
          sx={{
            bgcolor: "white",
            boxShadow: 2,
            width: 36,
            height: 36,
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          <ZoomInIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          onClick={() => {
            if (svgRef.current && zoomBehaviorRef.current) {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(300).call(
                zoomBehaviorRef.current.scaleBy as any,
                0.67
              );
            }
          }}
          sx={{
            bgcolor: "white",
            boxShadow: 2,
            width: 36,
            height: 36,
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          <ZoomOutIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          onClick={() => {
            if (svgRef.current && zoomBehaviorRef.current) {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(300).call(
                zoomBehaviorRef.current.transform as any,
                d3.zoomIdentity
              );
            }
          }}
          sx={{
            bgcolor: "white",
            boxShadow: 2,
            width: 36,
            height: 36,
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          <RestartAltIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

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
            opacity: isChartVisible ? 1 : 0,
            transform: isChartVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
              {selectedCountry.NAME_FR || selectedCountry.NAMEfr || "Pays"}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setIsChartVisible(false);
                setTimeout(() => setSelectedCountry(null), 200);
              }}
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

      {/* Top 5 des pays */}
      {showTop5 && (
        <Top5Countries
          geoData={geoData[currentIndex]?.features || []}
          onClose={() => setShowTop5(false)}
        />
      )}
    </div>
  );
};

export default Cartogram;