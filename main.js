import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

const start = [6.5665, 53.2194]; // Groningen
const BBOX = { minLon: 6.50, minLat: 53.15, maxLon: 6.65, maxLat: 53.25 };
const snapper = new RoadSnapper();

let initialized = false;

// ------------------------------------------------------------
// MAP
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            raster: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                maxzoom: 19
            },
            terrain: {
                type: "raster-dem",
                tiles: [
                    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                encoding: "terrarium"
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
// Convert lon/lat to MapLibre world coordinates
// ------------------------------------------------------------
function worldFromLonLat(lon, lat) {
    const p = map.project([lon, lat]);
    return [p.x, p.y];
}

// ------------------------------------------------------------
// LOAD ROADS FROM OVERPASS
// ------------------------------------------------------------
async function loadRoads() {
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

        // Convert lon/lat ➜ world x/y
        const pts = el.geometry.map(pt => worldFromLonLat(pt.lon, pt.lat));
        if (pts.length > 1) roads.push(pts);
    }

    console.log("Loaded Groningen roads:", roads.length);
    snapper.setRoads(roads);
}

// ------------------------------------------------------------
// 3D + CAR
// ------------------------------------------------------------
let threeLayer, car, camController;

map.on("idle", async () => {
    if (initialized) return;
    initialized = true;

    console.log("Map idle → initializing 3D layer");

    await loadRoads();

    threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
        console.log("Car loaded");

        car = new CarController(carModel, start, map, snapper);
        camController = new CameraController(threeLayer, car);

        // Spawn car ON nearest road
        car.snapToNearestRoad();
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
