import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as flubber from "flubber";
// @ts-ignore: no type declarations available for d3-geo-projection
import { geoBertin1953 } from "d3-geo-projection";
import MapToggle from "./MapToggle.tsx";
import { Box, Typography } from "@mui/material";
import { africanISO_A3 } from "./africanCountries.ts"; // ⚡ codes ISO Afrique

type GeoJSONType = any;

interface CartogramProps {
  geoUrls: string[];
}

const INDIA_A3 = "IND"; // ISO A3 Inde
const EUROPE_A3 = [
  "ALB", "AND", "AUT", "BLR", "BEL", "BIH", "BGR", "HRV", "CYP", "CZE", "DNK",
  "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT",
  "MDA", "MNE", "NLD", "MKD", "NOR", "POL", "PRT", "ROU", , "SMR", "SRB", "SVK", "SVN",
  "ESP", "SWE", "CHE", "GBR", "UKR", "VAT"
];

const Cartogram: React.FC<CartogramProps> = ({ geoUrls }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSONType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAfrica, setShowAfrica] = useState(false);
  const [showIndia, setShowIndia] = useState(false);
  const [showEurope, setShowEurope] = useState(false);

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
            properties: f.properties,
          });
        });
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

  const drawMap = () => {
    if (geoData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = geoBertin1953().fitExtent(
      [
        [width * 0.02, height * 0.02],
        [width * 0.98, height * 0.98],
      ],
      geoData[currentIndex]
    );

    const path = d3.geoPath().projection(projection);

    const graticule = d3.geoGraticule10();
    const graticulePath = d3.geoPath().projection(
      geoBertin1953().fitExtent(
        [
          [width * 0.02, height * 0.02],
          [width * 0.98, height * 0.98],
        ],
        geoData[0]
      )
    );

    svg
      .append("path")
      .datum(graticule)
      .attr("fill", "none")
      .attr("stroke", "#ccccccff")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")
      .attr("d", graticulePath as any);

    const displayedFeatures = geoData[currentIndex].features;

    svg
      .selectAll("path.geo")
      .data(displayedFeatures)
      .join("path")
      .attr("class", "geo")
      .attr("d", path as any)
      .attr("fill", (d: any) =>
        showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)
          ? "#e3d5a5ff"
          : showIndia && d.properties.ADM0_A3 === INDIA_A3
          ? "#ecc6d6ff"
          : showEurope && EUROPE_A3.includes(d.properties.ADM0_A3)
          ? "#c2d5bcff"
          : "#b0d3daff"
      )
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .on("mouseover", function (_: any, d: any) {
        const p = d.properties;
        const name = p.NAME_FR || p.NAMEfr || "Inconnu";
        const current = p.current ?? 0;
        const pop = p.POP_EST ?? 0;
        const ratio = pop ? current / pop : 0;

        d3.select(this).attr("stroke-width", 2).attr("fill-opacity", 0.4);

        tooltip
          .style("display", "block")
          .html(`
            <span style="font-size:14px; color: ${
              (showAfrica && africanISO_A3.includes(d.properties.ADM0_A3)) ||
              (showIndia && d.properties.ADM0_A3 === INDIA_A3) ||
              (showEurope && EUROPE_A3.includes(d.properties.ADM0_A3))
                ? "#404040ff"
                : "#4A919E"
            }; font-weight:bold;">${name}</span><br/>
            Mentions dans la presse : <strong>${current.toLocaleString()}</strong><br/>
            Mentions pour 1M d'habitant : <strong>${(ratio * 1e6).toFixed(2)}</strong> / 1M hab.
          `);
      })
      .on("mousemove", (event) => {
        const tooltipNode = tooltipRef.current;
        if (!tooltipNode) return;
        const tooltipWidth = tooltipNode.offsetWidth;
        const tooltipHeight = tooltipNode.offsetHeight;
        const margin = 10;
        let left = event.clientX + margin;
        let top = event.clientY + margin;
        if (left + tooltipWidth > window.innerWidth - margin) left = event.clientX - tooltipWidth - margin;
        if (top + tooltipHeight > window.innerHeight - margin) top = event.clientY - tooltipHeight - margin;
        tooltip.style("position", "fixed").style("left", left + "px").style("top", top + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 1).attr("fill-opacity", 1);
        tooltip.style("display", "none");
      });
  };

  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex, showAfrica, showIndia, showEurope]);

  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = geoBertin1953().fitExtent(
      [
        [width * 0.02, height * 0.02],
        [width * 0.98, height * 0.98],
      ],
      geoData[index]
    );
    const path = d3.geoPath().projection(projection);

    const fromFeatures = geoData[currentIndex].features;
    const toFeatures = geoData[index].features;

    const maxLen = Math.max(fromFeatures.length, toFeatures.length);
    const dummyPolygon = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]] },
      properties: {},
    };

    const fromPadded = [...fromFeatures];
    const toPadded = [...toFeatures];
    while (fromPadded.length < maxLen) fromPadded.push(dummyPolygon);
    while (toPadded.length < maxLen) toPadded.push(dummyPolygon);

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
          lineHeight: 1.3,
          whiteSpace: "nowrap",
        }}
      />
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
          onShowAfrica={() => {
            setShowAfrica(true);
            setShowIndia(false);
            setShowEurope(false);
          }}
          onShowIndia={() => {
            setShowAfrica(false);
            setShowIndia(true);
            setShowEurope(false);
          }}
          onShowEurope={() => {
            setShowAfrica(false);
            setShowIndia(false);
            setShowEurope(true);
          }}
        />
      </div>
    </div>
  );
};

export default Cartogram;
