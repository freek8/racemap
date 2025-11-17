// Minimal PBF / MapLibre demo vector tile decoder
// Patched for OpenMapTiles/MapLibre demo schema (free, no API key)

// Loads a vector tile from URL
export async function loadVectorTile(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn("Vector tile failed:", res.status, url);
            return null;
        }

        const buf = new Uint8Array(await res.arrayBuffer());
        return decodeMVT(buf);

    } catch (e) {
        console.error("Vector tile load error:", e);
        return null;
    }
}

// ---------------------------------------
// Decode MVT (Mapbox Vector Tile) using PBF
// ---------------------------------------
function decodeMVT(buffer) {
    const pbf = new Pbf(buffer);
    const tile = pbf.readFields(readTile, { layers: {} });

    // Each layer must have: name, keys[], values[], features[]
    for (const name in tile.layers) {
        const layer = tile.layers[name];

        // Normalize schema (important for demo tiles)
        layer.keys = layer.keys || [];
        layer.values = layer.values || [];
        layer.features = layer.features || [];
        layer.extent = layer.extent || 4096;

        // Convert MVT geometries into GeoJSON-like arrays
        layer.features = layer.features.map(f =>
            mvtFeatureToGeoJSON(f, layer)
        );
    }

    return tile;
}

// ---------------------------------------
// Tile structure reader
// ---------------------------------------
function readTile(tag, tile, pbf) {
    if (tag === 3) {
        const layer = pbf.readMessage(readLayer, {
            features: [],
            keys: [],
            values: []
        });
        tile.layers[layer.name] = layer;
    }
}

function readLayer(tag, layer, pbf) {
    if (tag === 1) layer.name = pbf.readString();
    else if (tag === 2) layer.features.push(
        pbf.readMessage(readFeature, { tags: {} })
    );
    else if (tag === 3) layer.keys.push(pbf.readString());
    else if (tag === 4) layer.values.push(readValue(pbf));
    else if (tag === 5) layer.extent = pbf.readVarint();
}

function readValue(pbf) {
    const val = {};
    const end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        const tag = pbf.readVarint() >> 3;

        if (tag === 1) val.string = pbf.readString();
        else if (tag === 2) val.float = pbf.readFloat();
        else if (tag === 3) val.double = pbf.readDouble();
        else if (tag === 4) val.int = pbf.readVarint();
        else if (tag === 5) val.uint = pbf.readVarint();
        else if (tag === 6) val.sint = pbf.readSVarint();
        else if (tag === 7) val.bool = !!pbf.readVarint();
    }

    return val;
}

// ---------------------------------------
// Feature & geometry parsing
// ---------------------------------------
function readFeature(tag, feature, pbf) {
    if (tag === 1) feature.id = pbf.readVarint();
    else if (tag === 2) feature.tags = readTags(feature.tags, pbf);
    else if (tag === 3) feature.type = pbf.readVarint();
    else if (tag === 4) feature.geometry = readGeometry(pbf);
}

function readTags(tags, pbf) {
    const end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        const keyIndex = pbf.readVarint();
        const valIndex = pbf.readVarint();
        tags[keyIndex] = valIndex; // store raw indexes
    }

    return tags;
}

function readGeometry(pbf) {
    const end = pbf.readVarint() + pbf.pos;
    const commands = [];

    while (pbf.pos < end) commands.push(pbf.readVarint());

    return commands;
}

// ---------------------------------------
// Geometry → GeoJSON polyline conversion
// ---------------------------------------
function mvtFeatureToGeoJSON(feature, layer) {
    return {
        id: feature.id,
        tags: feature.tags,
        geometry: parseGeometry(feature, layer.extent),
        type: "Feature"
    };
}

function parseGeometry(feature, extent) {
    const geom = feature.geometry;
    let x = 0, y = 0;
    const lines = [];
    let line = [];

    let i = 0;
    while (i < geom.length) {
        const cmd = geom[i] & 7;
        const count = geom[i++] >> 3;

        if (cmd === 1) { // MoveTo
            for (let c = 0; c < count; c++) {
                x += zigzag(geom[i++]);
                y += zigzag(geom[i++]);
                if (line.length) {
                    lines.push(line);
                    line = [];
                }
                line.push([x / extent, y / extent]);
            }
        }
        else if (cmd === 2) { // LineTo
            for (let c = 0; c < count; c++) {
                x += zigzag(geom[i++]);
                y += zigzag(geom[i++]);
                line.push([x / extent, y / extent]);
            }
        }
        else if (cmd === 7) {
            // ClosePath, ignore
        }
        else {
            console.warn("Unknown geometry command:", cmd);
        }
    }

    if (line.length) lines.push(line);

    return {
        type: "MultiLineString",
        coordinates: lines
    };
}

function zigzag(n) {
    return (n >> 1) ^ (-(n & 1));
}

// ---------------------------------------
// Minimal PBF reader
// ---------------------------------------
class Pbf {
    constructor(buf) {
        this.buf = buf;
        this.pos = 0;
        this.length = buf.length;
    }

    readFields(readField, result) {
        while (this.pos < this.length) {
            const val = this.readVarint();
            const tag = val >> 3;
            readField(tag, result, this);
        }
        return result;
    }

    readVarint() {
        let val = 0, shift = 0, b;
        do {
            b = this.buf[this.pos++];
            val |= (b & 0x7f) << shift;
            shift += 7;
        } while (b >= 0x80);
        return val;
    }

    readString() {
        const len = this.readVarint();
        const start = this.pos;
        this.pos += len;
        return new TextDecoder().decode(this.buf.subarray(start, start + len));
    }

    readFloat() {
        const v = new DataView(this.buf.buffer).getFloat32(this.pos, true);
        this.pos += 4;
        return v;
    }

    readDouble() {
        const v = new DataView(this.buf.buffer).getFloat64(this.pos, true);
        this.pos += 8;
        return v;
    }

    readMessage(readField, result) {
        const end = this.readVarint() + this.pos;
        while (this.pos < end) {
            const val = this.readVarint();
            const tag = val >> 3;
            readField(tag, result, this);
        }
        return result;
    }

    readSVarint() {
        return this.readVarint();
    }
}
