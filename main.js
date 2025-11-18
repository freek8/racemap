import { ThreeTerrainLayer } from "./engine/three-layer.js";
import { extractRoads } from "./engine/road-extractor.js";
import { RoadSnapper } from "./engine/road-snap.js";
import { lonLatToTile } from "./engine/coordinate-utils.js";
import { CarController } from "./engine/car-controller.js";
import { CameraController } from "./engine/camera-controller.js";
import { TerrainHelper } from "./engine/terrain.js";
import { PMTiles, Protocol } from "https://unpkg.com/pmtiles@2.9.0/dist/index.js";

const Z = 14;
const start = [6.5665, 53.2194]; // Groningen

// --------------------------------------------------
// PMTiles
// --------------------------------------------------
maplibregl.addProtocol("pmtiles", new Protocol());

// Your uploaded PMTiles file:
const PMTILES_URL = "https://mapracer.netlify.app/netherlands-roads.pmtiles";
const pmt = new PMTiles(PMTILES_URL);

// --------------------------------------------------
// MAP
// --------------------------------------------------
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
                encoding: "terrarium"
            }
        },
        layers: [
            { id: "raster-base", type: "raster", source: "raster" }
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

// --------------------------------------------------
// LOAD ROADS FROM PMTiles
// --------------------------------------------------
async function loadRoadsAround(lon, lat) {
    const t = lonLatToTile(lon, lat, Z);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);

    const all = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {

            const tile = await pmt.getZxy(Z, tx + dx, ty + dy);
            if (!tile || !tile.data) continue;

            const vt = new VectorTile(new Pbf(tile.data));

            if (vt.layers["roads"]) {
                for (let i = 0; i < vt.layers["roads"].length; i++) {
                    const feat = vt.layers["roads"].feature(i);
                    const geom = feat.loadGeometry();
                    if (geom && geom.length > 0) {
                        all.push(...geom.map(g => g.map(p => [p.x, p.y])));
                    }
                }
            }
        }
    }

    console.log("Loaded roads:", all.length);
    snapper.setRoads(all);
}

// --------------------------------------------------
// THREE + CAR
// --------------------------------------------------
let threeLayer;
let car;
let camController;

map.on("idle", async () => {
    if (!threeLayer) {
        await loadRoadsAround(start[0], start[1]);

        threeLayer = new ThreeTerrainLayer("./car.glb", (carModel) => {
            console.log("Car loaded");
            car = new CarController(carModel, start, map, snapper);
            camController = new CameraController(threeLayer, car);
        });

        map.addLayer(threeLayer);
        gameLoop();
    }
});

// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------
function gameLoop() {
    requestAnimationFrame(gameLoop);
    if (!car || snapper.roads.length === 0) return;
    car.update();
    camController.update();
}
