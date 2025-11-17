// Extract drivable OSM road geometries
const DRIVABLE=new Set([
 'motorway','motorway_link','trunk','trunk_link','primary','primary_link',
 'secondary','secondary_link','tertiary','tertiary_link','residential',
 'living_street','service','unclassified','track'
]);

export function extractRoads(tile){
 const out=[];
 if(!tile||!tile.layers||!tile.layers.transportation) return out;
 const layer=tile.layers.transportation;
 for(let i=0;i<layer.features.length;i++){
  const f=layer.features[i]; const type=getRoadType(f,layer);
  if(!DRIVABLE.has(type)) continue;
  if(f.geometry&&f.geometry.coordinates){
   const segs=f.geometry.coordinates;
   for(let s of segs){ if(s.length>=2) out.push(s); }
  }
 }
 return out;
}

function getRoadType(f,layer){
 const tags=f.tags; const keys=layer.keys||[]; const vals=layer.values||[];
 let out="";
 for(let k in tags){
  const ki=parseInt(k); const vi=tags[k];
  const key=keys[ki]; const v=vals[vi];
  if(key==='class'&&v&&v.string){ out=v.string; break; }
 }
 return out;
}
