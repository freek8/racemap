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

// Groningen bounding box for Overpass
const BBOX = {
    minLon: 6.50,
    minLat: 53.15,
    maxLon: 6.65,
    maxLat: 53.25
};

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
    zoom: 15,
    pitch: 60,
    bearing: 0,
    antialias: true
});

map.touchPitch.enable();
map.touchZoomRotate.enable();

const terrainHelper = new TerrainHelper(map);
const snapper = new RoadSnapper();

// ------------------------------------------------------------
// LOAD ROADS FROM OVERPASS (Groningen only)
// ------------------------------------------------------------
async function loadRoadsGroningen() {
    console.log("Fetching Groningen road network…");

    const query = `
        [out:json][timeout:25];
        way["highway"](${BBOX.minLat},${BBOX.minLon},${BBOX.maxLat},${BBOX.maxLon});
        (._;>;);
        out geom;
    `;

    const url = "https://overpass-api.de/api/interpreter";

    const response = await fetch(url, {
        method: "POST",
        body: query
    });

    const data = await response.json();

    console.log("Overpass ways:", data.elements.length);

    const roads = [];

    for (const el of data.elements) {
        if (el.type !== "way" || !el.geometry) continue;

        // Convert to lon/lat pairs
        const line = el.geometry.map(pt => [pt.lon, pt.lat]);

        if (line.length > 1) {
            roads.push(line);
        }
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
    if (!threeLayer) {
        console.log("Map idle → initializing 3D layer");

        await loadRoadsGroningen();

        threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
            console.log("Car loaded");

            car = new CarController(carModel, start, map, snapper);
            camController = new CameraController(threeLayer, car);
        });

        map.addLayer(threeLayer);
        gameLoop();
    }
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
