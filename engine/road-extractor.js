// Extract drivable roads from OpenMapTiles / MapLibre demo tiles

// Allowed drivable road classes in OpenMapTiles schema
const DRIVABLE = new Set([
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "residential",
    "service",
    "living_street",
    "unclassified",
    "road",          // fallback
    "minor",         // fallback
    "track"          // sometimes included
]);

// Exclude non-car ways
const EXCLUDE = new Set([
    "path",
    "footway",
    "cycleway",
    "bridleway",
    "steps",
    "pedestrian"
]);

export function extractRoads(tile) {
    if (!tile || !tile.layers) {
        console.warn("Tile has no layers");
        return [];
    }

    const layer = tile.layers.transportation;
    if (!layer || !layer.features) {
        console.warn("No transportation layer found");
        return [];
    }

    const roads = [];

    for (const f of layer.features) {
        const type = getRoadType(f, layer);

        if (!type) continue;
        if (EXCLUDE.has(type)) continue;

        // Accept if directly drivable OR "minor"/"road"
        if (!DRIVABLE.has(type) && type !== "road" && type !== "minor") continue;

        if (!f.geometry || !f.geometry.coordinates) continue;

        for (const seg of f.geometry.coordinates) {
            if (seg.length >= 2) {
                roads.push(seg);
            }
        }
    }

    return roads;
}

// ---------------------------------------
// Extract road type from tags
// OpenMapTiles transport schema:
//   class = 'motorway' | 'primary' | ...
//   subclass = 'service' | 'living_street' | ...
// ---------------------------------------
function getRoadType(feature, layer) {
    try {
        const { tags } = feature;
        const { keys = [], values = [] } = layer;

        let classType = null;
        let subclassType = null;

        for (const keyIndexStr in tags) {
            const keyIndex = Number(keyIndexStr);
            const valIndex = tags[keyIndexStr];

            const key = keys[keyIndex];
            const valObj = values[valIndex];

            if (!key || !valObj) continue;

            const value =
                valObj.string ??
                valObj.value ??
                valObj.name ??
                valObj.label ??
                null;

            if (!value) continue;

            if (key === "class") classType = value;
            if (key === "subclass") subclassType = value;
        }

        // Prefer exact class
        if (classType) return classType;

        // Fallback to subclass
        if (subclassType) return subclassType;

        return null;

    } catch (err) {
        console.warn("Road type decode error:", err);
        return null;
    }
}
