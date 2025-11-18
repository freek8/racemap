import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { loadVectorTile } from "./engine/vector-tile-loader.js";
import { extractRoads } from "./engine/road-extractor.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile, tileURL } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

const STADIA_KEY = "d0582653-98b5-4c74-9480-a865138eb438";   // <--- paste your key here

// Zoom level for vector tiles
const Z = 14;

// Start location (Groningen)
const start = [6.5665, 53.2194];

// ------------------------------------------------------------
// MAP
// ------------------------------------------------------------
const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            // Raster background (Stadia Maps - OSM)
            raster: {
                type: "raster",
                tiles: [
                    `https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.jpg?api_key=${STADIA_KEY}`
                ],
                tileSize: 256,
                maxzoom: 18
            },

            // Terrain DEM (Stadia)
            terrain: {
                type: "raster-dem",
                tiles: [
                    `https://tiles.stadiamaps.com/terrain-rgb/{z}/{x}/{y}.png?api_key=${STADIA_KEY}`
                ],
                tileSize: 256,
                maxzoom: 15
            }
        },

        layers: [
            { id: "raster-layer", type: "raster", source: "raster" }
        ],

        terrain: {
            source: "terrain",
            exaggeration: 1.0
        }
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

// ------------------------------------------------------------
// LOAD VECTOR ROADS (Stadia Maps Vector Tiles)
// ------------------------------------------------------------
const snapper = new RoadSnapper();

async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const all = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            const url = tileURL(
                `https://tiles.stadiamaps.com/data/vector/osm/{z}/{x}/{y}.pbf?api_key=${STADIA_KEY}`,
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
// THREE + CAR + CAMERA INIT
// ------------------------------------------------------------
let threeLayer;
let car;
let camController;

map.on("idle", async () => {
    if (!threeLayer) {
        console.log("Map idle → loading roads & initializing 3D");

        await loadRoadsAround(start[0], start[1]);

        threeLayer = new ThreeTerrainLayer("./car.glb", (model) => {
            console.log("Car model loaded");

            car = new CarController(model, start, map, snapper);
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
