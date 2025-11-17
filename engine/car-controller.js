// Car movement, road snapping, terrain following
// Patched for FREE OpenMapTiles / MapLibre demo tiles
// Safe against NaN, missing roads, terrain gaps, and OOB

import {
    lonLatToMerc,
    lonLatToTile,
    normalizePointInTile,
    normalizedToLonLat
} from "./coordinate-utils.js";

export class CarController {
    constructor(model, startLonLat, map, roadSnapper) {
        this.obj = model;
        this.map = map;
        this.snapper = roadSnapper;

        // Starting position
        this.lon = startLonLat[0];
        this.lat = startLonLat[1];

        const m = lonLatToMerc(this.lon, this.lat);
        this.x = m.x;
        this.y = m.y;
        this.z = 0;

        // Movement state
        this.dir = 0;
        this.speed = 0;

        // Safe tile zoom (free vector tiles support up to ~z14)
        this.tileZ = 14;

        // Input
        this.keys = {};
        window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);

        this.scaled = false;

        // Store last valid coordinates to prevent invalid jumps
        this.lastLon = this.lon;
        this.lastLat = this.lat;
    }

    update() {
        if (!this.snapper.roads.length) {
            // Roads not loaded yet → keep car still
            return;
        }

        this.handleInput();
        this.applyMovement();
        this.safeSnap();
        this.sampleTerrain();
        this.updateModel();
    }

    // ----------------------------
    // Movement input
    // ----------------------------
    handleInput() {
        if (this.keys["w"]) this.speed = 22;
        else if (this.keys["s"]) this.speed = -12;
        else this.speed = 0;

        if (this.keys["a"]) this.dir += 0.04;
        if (this.keys["d"]) this.dir -= 0.04;
    }

    // ----------------------------
    // Apply forward/backward movement
    // ----------------------------
    applyMovement() {
        const dx = Math.cos(this.dir) * this.speed;
        const dy = Math.sin(this.dir) * this.speed;

        // Move mercator coordinates
        this.x += dx;
        this.y += dy;

        // Convert using map to stay consistent
        const p = this.map.project([this.lon, this.lat]);
        const p2 = { x: p.x + dx, y: p.y + dy };
        const ll = this.map.unproject([p2.x, p2.y]);

        if (!isFinite(ll.lng) || !isFinite(ll.lat)) {
            console.warn("Invalid move → restoring last known position");
            return;
        }

        this.lon = ll.lng;
        this.lat = ll.lat;

        this.lastLon = this.lon;
        this.lastLat = this.lat;
    }

    // ----------------------------
    // SAFE snapping to nearest road
    // ----------------------------
    safeSnap() {
        const tilePos = normalizePointInTile(this.lon, this.lat, this.tileZ);

        const snapped = this.snapper.snapPosition(tilePos.nx, tilePos.ny);

        if (!snapped
            || !isFinite(snapped.x)
            || !isFinite(snapped.y)
            || !isFinite(snapped.dir.x)
            || !isFinite(snapped.dir.y)) {

            console.warn("Snapping failed → keeping last position");
            this.lon = this.lastLon;
            this.lat = this.lastLat;
            return;
        }

        const ll = normalizedToLonLat(
            tilePos.tx,
            tilePos.ty,
            snapped.x,
            snapped.y,
            this.tileZ
        );

        if (!isFinite(ll.lon) || !isFinite(ll.lat)) {
            console.warn("Snapped lon/lat invalid → restoring last valid");
            this.lon = this.lastLon;
            this.lat = this.lastLat;
            return;
        }

        // Update lon/lat
        this.lon = ll.lon;
        this.lat = ll.lat;

        const m = lonLatToMerc(this.lon, this.lat);

        if (!isFinite(m.x) || !isFinite(m.y)) {
            console.warn("Mercator conversion invalid → roll back");
            this.lon = this.lastLon;
            this.lat = this.lastLat;
            return;
        }

        // Save last valid
        this.lastLon = this.lon;
        this.lastLat = this.lat;

        this.x = m.x;
        this.y = m.y;

        // Update direction
        this.dir = Math.atan2(snapped.dir.y, snapped.dir.x);
    }

    // ----------------------------
    // Terrain elevation sampling
    // ----------------------------
    sampleTerrain() {
        const h = this.map.queryTerrainElevation([this.lon, this.lat]);
        this.z = isFinite(h) ? h : 0;
    }

    // ----------------------------
    // Update Three.js model transform
    // ----------------------------
    updateModel() {
        this.obj.position.set(this.x, this.y, this.z);
        this.obj.rotation.z = -this.dir;

        // Auto-scale the car model to ~4m long
        if (!this.scaled) {
            const box = new THREE.Box3().setFromObject(this.obj);
            const size = new THREE.Vector3();
            box.getSize(size);

            const scale = 4 / Math.max(size.x, size.y, size.z);
            this.obj.scale.set(scale, scale, scale);

            this.scaled = true;
        }
    }

    getChaseTarget() {
        return {
            position: this.obj.position,
            rotation: this.obj.rotation
        };
    }
}
