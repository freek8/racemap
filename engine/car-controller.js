export class CarController {
    constructor(model, startLonLat, map, snapper) {
        this.model = model;
        this.map = map;
        this.snapper = snapper;

        // initial lon/lat
        this.lonLat = startLonLat;

        // initial world pos
        const p = map.project(startLonLat);
        this.x = p.x;
        this.y = p.y;

        this.speed = 0.0;
        this.direction = 0; // radians
    }

    // ------------------------------------------------------------
    // NEW: Snap car to nearest OSM road in world coordinates
    // ------------------------------------------------------------
    snapToNearestRoad() {
        const p = this.map.project(this.lonLat);
        const nearest = this.snapper.findNearestRoad([p.x, p.y]);

        if (!nearest) {
            console.warn("No road nearby to snap to!");
            return;
        }

        // Use snapped world coordinates
        this.x = nearest.point[0];
        this.y = nearest.point[1];

        // update visual model
        this.model.position.set(this.x, 0, this.y);

        console.log("Car snapped to road at:", this.x, this.y);
    }

    // ------------------------------------------------------------
    // Update car physics + model position
    // ------------------------------------------------------------
    update() {
        // movement keys
        if (window.keyState?.ArrowUp) this.speed += 0.1;
        if (window.keyState?.ArrowDown) this.speed -= 0.1;
        if (window.keyState?.ArrowLeft) this.direction += 0.04;
        if (window.keyState?.ArrowRight) this.direction -= 0.04;

        this.speed *= 0.98; // friction

        // car movement in world space
        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        // update model position
        this.model.position.set(this.x, 0, this.y);

        // match model rotation to direction
        this.model.rotation.y = -this.direction;
    }
}
