declare namespace GeoJSON {
  export type GeoJsonTypes =
    | "Feature"
    | "FeatureCollection"
    | "Point"
    | "MultiPoint"
    | "LineString"
    | "MultiLineString"
    | "Polygon"
    | "MultiPolygon"
    | "GeometryCollection";

  export type Position = number[];
  export type BBox = number[];
  export type GeoJsonProperties = { [name: string]: any } | null;

  export interface GeoJsonObject {
    bbox?: BBox;
    type: GeoJsonTypes;
  }

  export interface Geometry extends GeoJsonObject {}
  export type GeometryObject = Geometry;

  export interface Point extends Geometry {
    coordinates: Position;
    type: "Point";
  }

  export interface MultiPoint extends Geometry {
    coordinates: Position[];
    type: "MultiPoint";
  }

  export interface LineString extends Geometry {
    coordinates: Position[];
    type: "LineString";
  }

  export interface MultiLineString extends Geometry {
    coordinates: Position[][];
    type: "MultiLineString";
  }

  export interface Polygon extends Geometry {
    coordinates: Position[][];
    type: "Polygon";
  }

  export interface MultiPolygon extends Geometry {
    coordinates: Position[][][];
    type: "MultiPolygon";
  }

  export interface GeometryCollection<G extends Geometry = Geometry> extends Geometry {
    geometries: G[];
    type: "GeometryCollection";
  }

  export interface Feature<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties,
  > extends GeoJsonObject {
    geometry: G;
    id?: number | string;
    properties: P;
    type: "Feature";
  }

  export interface FeatureCollection<
    G extends Geometry | null = Geometry,
    P = GeoJsonProperties,
  > extends GeoJsonObject {
    features: Array<Feature<G, P>>;
    type: "FeatureCollection";
  }
}

declare module "geojson" {
  export = GeoJSON;
}
