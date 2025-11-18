// Extract drivable roads from OpenFreeMap / OSM-Flex tiles

// All drivable road types in free OSM vector tiles
const DRIVABLE = new Set([
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "unclassified",
    "service",
    "living_street",
    "road",
    "minor",
    "track"
]);

// Exclude on-foot layers
const EXCLUDE = new Set([
    "footway",
    "path",
    "cycleway",
    "steps",
    "pedestrian"
]);

export function extractRoads(tile) {
    if (!tile || !tile.layers) {
        console.warn("Tile has no layers");
        return [];
    }

    // Correct layer names for OpenFreeMap vector tiles:
    const layer =
        tile.layers.transportation ||  // MapTiler/OpenMapTiles
        tile.layers.roads ||           // OpenFreeMap (OSM Flex)
        tile.layers.highway ||         // Some OSM free servers
        null;

    if (!layer || !layer.features) {
        console.warn("No transportation layer found");
        return [];
    }

    const roads = [];

    for (const f of layer.features) {
        const type = getRoadType(f);

        if (!type) continue;
        if (EXCLUDE.has(type)) continue;
        if (!DRIVABLE.has(type)) continue;

        if (!f.geometry || !f.geometry.coordinates) continue;

        for (const seg of f.geometry.coordinates) {
            if (seg.length >= 2) {
                roads.push(seg);
            }
        }
    }

    return roads;
}

function getRoadType(feature) {
    try {
        const props = feature.properties || {};
        const type =
            props.class ||
            props.highway ||
            props.road ||
            props.type ||
            null;

        return type;
    } catch (err) {
        console.warn("Failed to get road type:", err);
        return null;
    }
}
