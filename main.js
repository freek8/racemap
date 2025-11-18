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

// Global reliable zoom range:
const Z = 14;

// Start in Groningen center
const start = [6.5665, 53.2194];

// ------------------------------------------------------------
// MAP INITIALIZATION (FREE, GLOBAL, NO LOGIN)
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            // Free OSM raster layer
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
                encoding: "terrarium",
                maxzoom: 15
            }
        },

        layers: [
            { id: "osm-layer", type: "raster", source: "raster" }
        ],

        // Enable terrain
        terrain: { source: "terrain", exaggeration: 1.0 }
    },

    center: start,
    zoom: 15,
    pitch: 60,
    bearing: 0,
    antialias: true
});

// Enable touch controls
map.touchPitch.enable();
map.touchZoomRotate.enable();

const terrainHelper = new TerrainHelper(map);

// ------------------------------------------------------------
// ROAD LOADING via Nextzen (FREE GLOBAL VECTOR TILES)
// ------------------------------------------------------------
const snapper = new RoadSnapper();

// Nextzen Open Source API key (free)
const NEXTZEN_KEY = "mapzen-2YqfP2Y";

async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const all = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            const url = tileURL(
                `https://tile.nextzen.org/tilezen/vector/v1/256/all/{z}/{x}/{y}.mvt?api_key=${NEXTZEN_KEY}`,
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

        // Load road network (Nextzen)
        await loadRoadsAround(start[0], start[1]);

        // Add the Three.js layer
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
