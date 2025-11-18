import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------
const start = [6.5665, 53.2194]; // Groningen center

// Groningen bounding box for Overpass API
const BBOX = {
    minLon: 6.50,
    minLat: 53.15,
    maxLon: 6.65,
    maxLat: 53.25
};

let initialized = false;
const snapper = new RoadSnapper();

// ------------------------------------------------------------
// MAP SETUP WITH QUANTIZED-MESH TERRAIN
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,

        sources: {
            // OpenStreetMap raster tiles
            raster: {
                type: "raster",
                tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                maxzoom: 19
            },

            // ⭐ GLOBAL QUANTIZED MESH TERRAIN (no 400 errors)
            terrain: {
                type: "raster-dem",
                tiles: [
                    "https://maps.tilehosting.com/data/terrain-quantized-mesh/{z}/{x}/{y}.terrain?key=WyA1G3oO8gjZtlmsFmJQ"
                ],
                tileSize: 256,
                maxzoom: 14
            }
        },

        layers: [
            { id: "osm", type: "raster", source: "raster" }
        ],

        // Enable terrain
        terrain: { source: "terrain", exaggeration: 1.0 }
    },

    center: start,
    zoom: 17,
    pitch: 60,
    bearing: 0,
    antialias: true
});

// Enable gestures
map.touchPitch.enable();
map.touchZoomRotate.enable();

const terrainHelper = new TerrainHelper(map);

// ------------------------------------------------------------
// Convert lon/lat → world x/y coordinates for snapping + 3D
// ------------------------------------------------------------
function worldFromLonLat(lon, lat) {
    const p = map.project([lon, lat]);
    return [p.x, p.y];
}

// ------------------------------------------------------------
// LOAD ROADS FROM OVERPASS API
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

        // Convert from lon/lat → map world x/y
        const pts = el.geometry.map(pt => worldFromLonLat(pt.lon, pt.lat));

        if (pts.length > 1) {
            roads.push(pts);
        }
    }

    console.log("Loaded Groningen roads:", roads.length);

    snapper.setRoads(roads);
}

// ------------------------------------------------------------
// 3D LAYER, CAR, CAMERA
// ------------------------------------------------------------
let threeLayer;
let car;
let camController;

// Use "idle" to wait for map to fully load
map.on("idle", async () => {
    if (initialized) return;
    initialized = true;

    console.log("Map idle → initializing 3D layer");

    await loadRoadsGroningen();

    // Load car model inside ThreeTerrainLayer
    threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
        console.log("Car loaded");

        // Create car controller
        car = new CarController(carModel, start, map, snapper);

        // Create camera controller
        camController = new CameraController(threeLayer, car);

        // Snap car to nearest OSM road
        if (car.snapToNearestRoad) {
            car.snapToNearestRoad();
            console.log("Car snapped to nearest road");
        } else {
            console.warn("car.snapToNearestRoad() is missing!");
        }
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
