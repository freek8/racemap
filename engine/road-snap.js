export class RoadSnapper {
    constructor() {
        this.roads = []; // array of polylines
    }

    setRoads(roads) {
        this.roads = roads;
    }

    // --------------------------------------------
    // Find the nearest point on all loaded roads
    // --------------------------------------------
    findNearestRoad(point) {
        let best = null;
        let bestDist = Infinity;

        for (const road of this.roads) {
            for (let i = 0; i < road.length - 1; i++) {
                // segment endpoints
                const a = road[i];
                const b = road[i + 1];

                const nearest = this._nearestPointOnSegment(a, b, point);
                const dist = this._dist(point, nearest);

                if (dist < bestDist) {
                    bestDist = dist;
                    best = { point: nearest, dist };
                }
            }
        }

        return best;
    }

    // --------------------------------------------
    // Math helpers
    // --------------------------------------------
    _nearestPointOnSegment(a, b, p) {
        const ax = a[0], ay = a[1];
        const bx = b[0], by = b[1];
        const px = p[0], py = p[1];

        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;

        const abLenSq = abx * abx + aby * aby;
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));

        return [ax + abx * t, ay + aby * t];
    }

    _dist(a, b) {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
}
