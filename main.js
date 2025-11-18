import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------
const start = [6.5665, 53.2194]; // Groningen center

// Groningen boundary for Overpass (small but dense)
const BBOX = {
    minLon: 6.50,
    minLat: 53.15,
    maxLon: 6.65,
    maxLat: 53.25
};

let initialized = false;
const snapper = new RoadSnapper();

// ------------------------------------------------------------
// MAP
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            // OSM raster tiles
            raster: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                maxzoom: 19
            },

            // GLOBAL DEM (THIS FIXES CAR NOT APPEARING)
            terrain: {
                type: "raster-dem",
                tiles: [
                    "https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                maxzoom: 14
            }
        },
        layers: [
            { id: "osm", type: "raster", source: "raster" }
        ],
        terrain: { source: "terrain", exaggeration: 1.0 }
    },

    center: start,
    zoom: 17,
    pitch: 60,
    bearing: 0,
    antialias: true
});

map.touchPitch.enable();
map.touchZoomRotate.enable();

const terrainHelper = new TerrainHelper(map);

// ------------------------------------------------------------
// UTIL: Convert lon/lat → MapLibre world coordinates
// ------------------------------------------------------------
function worldFromLonLat(lon, lat) {
    const p = map.project([lon, lat]);
    return [p.x, p.y];
}

// ------------------------------------------------------------
// LOAD ROADS FROM OVERPASS
// ------------------------------------------------------------
async function loadRoadsGroningen() {
    console.log("Fetching Groningen road network…");

    const query = `
        [out:json][timeout:25];
        way["highway"](${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon});
        (._;>;);
        out geom;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
    });

    const data = await response.json();

    console.log("Overpass ways:", data.elements.length);

    const roads = [];

    for (const el of data.elements) {
        if (el.type !== "way" || !el.geometry) continue;

        // Convert to projected coordinates
        const worldLine = el.geometry.map(pt => worldFromLonLat(pt.lon, pt.lat));
        if (worldLine.length > 1) roads.push(worldLine);
    }

    console.log("Loaded Groningen roads:", roads.length);

    snapper.setRoads(roads);
}

// ------------------------------------------------------------
// 3D + CAR
// ------------------------------------------------------------
let threeLayer;
let car;
let camController;

map.on("idle", async () => {
    if (initialized) return;
    initialized = true;

    console.log("Map idle → initializing 3D layer");

    await loadRoadsGroningen();

    threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
        console.log("Car loaded");

        car = new CarController(carModel, start, map, snapper);
        camController = new CameraController(threeLayer, car);

        // Spawn car ON nearest road
        car.snapToNearestRoad();

        console.log("Car placed on road.");
    });

    map.addLayer(threeLayer);

    gameLoop();
});

// ------------------------------------------------------------
// GAME LOOP
// ------------------------------------------------------------
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (!car || snapper.roads.length === 0) return;

    car.update();
    camController.update();
}
