// Smooth, safe chase camera controller
// Patched for free OpenMapTiles / MapLibre demo tiles
// Protected against NaN, invalid positions, and missing target data

export class CameraController {
    constructor(threeLayer, carController) {
        this.layer = threeLayer;
        this.car = carController;

        // Smoothed camera internal state
        this.smoothPos = { x: 0, y: 0, z: 0 };
        this.smoothRot = 0;

        // Speed of smoothing (0.0 = instant, 1.0 = infinite delay)
        this.followSpeed = 0.12;

        // Last-valid fallback
        this.lastGood = {
            x: 0,
            y: 0,
            z: 50,
            rot: 0
        };

        this.initialized = false;
    }

    update() {
        if (!this.car || !this.car.obj) return;

        const t = this.car.getChaseTarget();
        if (!t || !t.position) return;

        const p = t.position;
        const rot = t.rotation.z;

        // -------------------------------------------------------
        // VALIDITY CHECKS — prevent NaN from poisoning the camera
        // -------------------------------------------------------
        if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
            console.warn("Camera skipping: car position invalid");
            return;
        }

        if (!isFinite(rot)) {
            console.warn("Camera skipping: invalid rotation");
            return;
        }

        // First-time initialization
        if (!this.initialized) {
            this.smoothPos.x = this.lastGood.x = p.x;
            this.smoothPos.y = this.lastGood.y = p.y;
            this.smoothPos.z = this.lastGood.z = p.z + 20;
            this.smoothRot = this.lastGood.rot = rot;
            this.initialized = true;
        }

        // -------------------------------------------------------
        // SAFE SMOOTHING
        // -------------------------------------------------------
        this.smoothPos.x += (p.x - this.smoothPos.x) * this.followSpeed;
        this.smoothPos.y += (p.y - this.smoothPos.y) * this.followSpeed;

        const targetZ = Math.max(p.z + 20, 2);
        this.smoothPos.z += (targetZ - this.smoothPos.z) * this.followSpeed;

        this.smoothRot += (rot - this.smoothRot) * this.followSpeed;

        // Save last known good values
        this.lastGood.x = this.smoothPos.x;
        this.lastGood.y = this.smoothPos.y;
        this.lastGood.z = this.smoothPos.z;
        this.lastGood.rot = this.smoothRot;

        // -------------------------------------------------------
        // Apply chase camera position to ThreeTerrainLayer
        // -------------------------------------------------------
        const chaseTarget = {
            position: new THREE.Vector3(
                this.smoothPos.x,
                this.smoothPos.y,
                this.smoothPos.z
            ),
            rotation: { z: this.smoothRot }
        };

        this.layer.setChaseTarget(chaseTarget);
    }
}
