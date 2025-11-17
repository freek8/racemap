// Three.js inside MapLibre custom 3D layer (patched + stable version)

export class ThreeTerrainLayer {
    constructor(modelPath, callback) {
        this.id = "three-terrain-layer";
        this.type = "custom";
        this.renderingMode = "3d";

        this.modelPath = modelPath;
        this.onModelLoaded = callback;

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.car = null;
        this.chaseTarget = null;
    }

    onAdd(map, gl) {
        this.map = map;

        // Required for MapLibre → Three.js shared WebGL rendering
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
            alpha: false
        });

        this.renderer.autoClear = false;

        // Create scene + camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.camera.matrixAutoUpdate = false;

        // Load GLTF car model
        const loader = new THREE.GLTFLoader();
        loader.load(this.modelPath, (gltf) => {
            this.car = gltf.scene;
            this.scene.add(this.car);

            if (this.onModelLoaded) this.onModelLoaded(this.car);
        });
    }

    setChaseTarget(target) {
        // target = { position: THREE.Vector3, rotation: {z: angle} }
        this.chaseTarget = target;
    }

    render(gl, matrix) {
        if (!this.car) return;

        // -------------------------------
        // 1) MapLibre projection → Three.js
        // -------------------------------
        this.camera.projectionMatrix.fromArray(matrix);

        // REQUIRED for correct rendering with Three.js r128+
        this.camera.projectionMatrixInverse
            .copy(this.camera.projectionMatrix)
            .invert();

        // -------------------------------
        // 2) Camera follow mode
        // -------------------------------
        if (this.chaseTarget) {
            const p = this.chaseTarget.position;
            const rot = this.chaseTarget.rotation.z;

            // Medium chase cam (C2)
            const dist = 45;
            const height = 22;

            const cx = p.x - Math.cos(rot) * dist;
            const cy = p.y - Math.sin(rot) * dist;
            const cz = p.z + height;

            // Apply camera transform directly
            this.camera.matrixWorld.makeTranslation(cx, cy, cz);
        }

        // -------------------------------
        // 3) Render
        // -------------------------------
        this.renderer.resetState();     // <-- CRITICAL FIX
        this.renderer.render(this.scene, this.camera);

        // Tell MapLibre to re-render continuously
        this.map.triggerRepaint();
    }
}
