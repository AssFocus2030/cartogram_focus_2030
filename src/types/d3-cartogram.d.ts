declare module "d3-cartogram" {
  import { GeoProjection, GeoPath } from "d3-geo";
  import { FeatureCollection, Geometry } from "geojson";

  type Cartogram = {
    projection(proj: GeoProjection): Cartogram;
    value(val: (d: any) => number): Cartogram;
    iterations?(i: number): Cartogram;
    (topology: FeatureCollection<Geometry, any>, values: number[]): FeatureCollection<Geometry, any>;
  };

  function cartogram(): Cartogram;

  export default cartogram;
}
