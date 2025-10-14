import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as flubber from "flubber";
import { geoBertin1953 } from "d3-geo-projection";
import MapToggle from "./MapToggle";

type GeoJSONType = any;

interface CartogramProps {
  geoUrls: string[];
}

const Cartogram: React.FC<CartogramProps> = ({ geoUrls }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [geoData, setGeoData] = useState<GeoJSONType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const drawMap = () => {
    if (geoData.length === 0) return;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projection = geoBertin1953()
      .scale(width / 1.5 / Math.PI)
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    const graticule = d3.geoGraticule();
    svg.selectAll(".graticule")
      .data([graticule()])
      .join("path")
      .attr("class", "graticule")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")
      .attr("d", path as any);

    svg.selectAll("path.geo")
      .data(geoData[currentIndex].features)
      .join(
        enter => enter.append("path")
          .attr("class", "geo")
          .attr("d", path as any)
          .attr("fill", "#98cbd5ff")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
         .on("mouseover", (_, d) => {
  const feature = d as { properties: Record<string, any> };
  const name = feature.properties.NAMEfr || "Inconnu";
  const pop = feature.properties.POP_2023 != null
    ? Number(feature.properties.POP_2023).toLocaleString("fr-FR") // espace entre les milliers
    : "N/A";

  tooltip
    .style("display", "block")
    .html(`<strong>${name}</strong><br/>Nombre de mentions dans les médias français : ${pop}`);
})

          .on("mousemove", event => {
            tooltip
              .style("position", "fixed")
              .style("left", event.clientX + 5 + "px")
              .style("top", event.clientY + 5 + "px");
          })
          .on("mouseout", () => tooltip.style("display", "none")),
        update => update.attr("d", path as any)
      );
  };

  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [geoData, currentIndex]);

  const changeMap = (index: number) => {
    if (geoData.length === 0 || index === currentIndex) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || window.innerWidth;
    const height = svgRef.current?.clientHeight || window.innerHeight;

    const projectionFrom = geoBertin1953()
      .scale(width / 1.5 / Math.PI)
      .translate([width / 2, height / 2]);
    const pathFrom = d3.geoPath().projection(projectionFrom);
    const fromFeatures = geoData[currentIndex].features;

    const projectionTo = geoBertin1953()
      .scale(width / 1.5 / Math.PI)
      .translate([width / 2, height / 2]);
    const pathTo = d3.geoPath().projection(projectionTo);
    const toFeatures = geoData[index].features;

    const maxLen = Math.max(fromFeatures.length, toFeatures.length);
    const dummyPolygon = {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[[0,0],[0,0],[0,0],[0,0]]] },
      properties: {}
    };
    const fromPadded = [...fromFeatures];
    const toPadded = [...toFeatures];
    while (fromPadded.length < maxLen) fromPadded.push(dummyPolygon);
    while (toPadded.length < maxLen) toPadded.push(dummyPolygon);

    const fromPaths = fromPadded.map(f => pathFrom(f) as string);
    const toPaths = toPadded.map(f => pathTo(f) as string);

    svg.selectAll("path.geo")
      .data(toPaths)
      .join("path")
      .transition()
      .duration(1000)
      .attrTween("d", (_, i) => flubber.interpolate(fromPaths[i], toPaths[i]));

    setCurrentIndex(index);
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
      {/* Toggle MUI en haut à droite */}
      <div style={{ position: "absolute", top: 10, right: 10, background: "white", padding: 5, borderRadius: 4 }}>
        <MapToggle checked={currentIndex === 1} onChange={(checked) => changeMap(checked ? 1 : 0)} />
      </div>
    </div>
  );
};

export default Cartogram;
