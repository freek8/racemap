import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { loadVectorTile } from "./engine/vector-tile-loader.js";
import { extractRoads } from "./engine/road-extractor.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile, tileURL } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

// -------------------------------------------
// SETTINGS
// -------------------------------------------
const API_KEY = "84I0brm1Nz3hhuwn2JP4";
const Z = 16;      // vector road zoom
const start = [6.5665, 53.2194]; // Groningen center

// -------------------------------------------
// MAP INITIALIZATION
// -------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            sat: {
                type: "raster",
                tiles: [
                    `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${API_KEY}`
                ],
                tileSize: 256,
                maxzoom: 20
            },
            terrain: {
                type: "raster-dem",
                tiles: [
                    `https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.png?key=${API_KEY}`
                ],
                tileSize: 256,
                maxzoom: 14
            }
        },
        layers: [
            { id: "sat-layer", type: "raster", source: "sat" }
        ],
        terrain: { source: "terrain", exaggeration: 1.0 }
    },
    center: start,
    zoom: 16,
    pitch: 58,
    bearing: 0,
    antialias: true
});

map.touchPitch.enable();
map.touchZoomRotate.enable();

// -------------------------------------------
// TERRAIN SMOOTHER
// -------------------------------------------
const terrainHelper = new TerrainHelper(map);

// -------------------------------------------
// ROAD LOADING
// -------------------------------------------
const snapper = new RoadSnapper();

async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const needed = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            needed.push({ x: tx + dx, y: ty + dy });
        }
    }

    const all = [];

    for (let t of needed) {
        const url = tileURL(
            `https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=${API_KEY}`,
            Z, t.x, t.y
        );

        const tile = await loadVectorTile(url);
        if (!tile) continue;

        const roads = extractRoads(tile);
        all.push(...roads);
    }

    snapper.setRoads(all);
}

// -------------------------------------------
// THREE.JS LAYER + CAR + CAMERA
// -------------------------------------------
let threeLayer;
let car;
let camController;

// IMPORTANT: Must wait for FULL MAP INIT
map.on("idle", async () => {

    if (!threeLayer) {
        console.log("Map idle → initializing 3D layer");

        await loadRoadsAround(start[0], start[1]);

        // Load car.glb from the ROOT directory
        threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
            console.log("Car model loaded");
            car = new CarController(carModel, start, map, snapper);
            camController = new CameraController(threeLayer, car);
        });

        map.addLayer(threeLayer);
        gameLoop();
    }
});

// -------------------------------------------
// GAME LOOP
// -------------------------------------------
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (!car) return;

    car.update();
    camController.update();
}
