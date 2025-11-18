import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { loadVectorTile } from "./engine/vector-tile-loader.js";
import { extractRoads } from "./engine/road-extractor.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile, tileURL } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

// Vector tiles: stable up to Z=14
// Terrain tiles: terrarium supports up to Z=15
// Raster tiles: up to Z=19
const Z = 14;

// Start position (Groningen)
const start = [6.5665, 53.2194];

// ------------------------------------------------------------
// MAP INITIALIZATION (FREE, GLOBAL, NO API KEY)
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            // Free OSM raster
            raster: {
                type: "raster",
                tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                maxzoom: 19
            },

            // Free global TERRARIUM DEM (AWS)
            terrain: {
                type: "raster-dem",
                tiles: [
                    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                maxzoom: 15,
                encoding: "terrarium"
            }
        },

        layers: [
            { id: "osm-layer", type: "raster", source: "raster" }
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

// Terrain smoother
const terrainHelper = new TerrainHelper(map);

// ------------------------------------------------------------
// FREE VECTOR TILE ROAD LOADING (OpenFreeMap)
// ------------------------------------------------------------
const snapper = new RoadSnapper();

async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const all = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            // This is the correct FREE vector tile server
            const url = tileURL(
                "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf",
                Z,
                tx + dx,
                ty + dy
            );

            const tile = await loadVectorTile(url);
            if (!tile) continue;

            const roads = extractRoads(tile);
            all.push(...roads);
        }
    }

    console.log("Loaded roads:", all.length);
    snapper.setRoads(all);
}

// ------------------------------------------------------------
// THREE.JS LAYER + CAR + CAMERA
// ------------------------------------------------------------
let threeLayer;
let car;
let camController;

map.on("idle", async () => {
    if (!threeLayer) {
        console.log("Map idle → initializing 3D layer");

        // Load the roads
        await loadRoadsAround(start[0], start[1]);

        // 3D custom layer
        threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
            console.log("Car model loaded");

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
