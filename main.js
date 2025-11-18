import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { loadVectorTile } from "./engine/vector-tile-loader.js";
import { extractRoads } from "./engine/road-extractor.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile, tileURL } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";

const Z = 14;
const start = [6.5665, 53.2194]; // Groningen

const map = new maplibregl.Map({
    container: "map",
    style: {
        version: 8,
        sources: {
            raster: {
                type: "raster",
                tiles: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                maxzoom: 19
            },
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

const VECTOR_TILE_URL =
    "https://openmaptiles.github.io/tiles/{z}/{x}/{y}.pbf";

async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const all = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            const url = tileURL(VECTOR_TILE_URL, Z, tx + dx, ty + dy);

            const tile = await loadVectorTile(url);
            if (!tile) continue;

            const roads = extractRoads(tile);
            all.push(...roads);
        }
    }

    console.log("Loaded roads:", all.length);
    snapper.setRoads(all);
}

let threeLayer;
let car;
let camController;

map.on("idle", async () => {
    if (!threeLayer) {
        console.log("Map idle → initializing 3D layer");

        await loadRoadsAround(start[0], start[1]);

        threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
            console.log("Car model loaded");
            car = new CarController(carModel, start, map, snapper);
            camController = new CameraController(threeLayer, car);
        });

        map.addLayer(threeLayer);

        gameLoop();
    }
});

function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (!car || snapper.roads.length === 0) return;

    car.update();
    camController.update();
}
