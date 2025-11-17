// Minimal PBF / Mapbox Vector Tile decoder
export async function loadVectorTile(url){
 const r=await fetch(url); if(!r.ok) return null;
 const b=new Uint8Array(await r.arrayBuffer());
 return decodeMVT(b);
}

function decodeMVT(buf){
 const p=new Pbf(buf);
 const t=p.readFields(readTile,{layers:{}});
 Object.keys(t.layers).forEach(k=>{
  const l=t.layers[k];
  l.features=l.features.map(f=>vectorTileFeatureToGeoJSON(f,l));
 });
 return t;
}

function readTile(tag,t,p){ if(tag===3){ const l=p.readMessage(readLayer,{features:[]}); t.layers[l.name]=l; } }
function readLayer(tag,l,p){
 if(tag===1) l.name=p.readString();
 else if(tag===2) l.features.push(p.readMessage(readFeature,{tags:{}}));
 else if(tag===3) l.keys=p.readString();
 else if(tag===4) l.values=readValue(p);
 else if(tag===5) l.extent=p.readVarint();
}

function readValue(p){ const v={}; const e=p.readVarint()+p.pos;
 while(p.pos<e){ const t=p.readVarint()>>3;
  if(t===1) v.string=p.readString();
  else if(t===2) v.float=p.readFloat();
  else if(t===3) v.double=p.readDouble();
  else if(t===4) v.int=p.readVarint();
  else if(t===5) v.uint=p.readVarint();
  else if(t===6) v.sint=p.readSVarint();
  else if(t===7) v.bool=!!p.readVarint(); }
 return v; }

function readFeature(tag,f,p){
 if(tag===1) f.id=p.readVarint();
 else if(tag===2) f.tags=readTags(f.tags||{},p);
 else if(tag===3) f.type=p.readVarint();
 else if(tag===4) f.geometry=readGeometry(p);
}

function readTags(t,p){ const e=p.readVarint()+p.pos;
 while(p.pos<e){ const k=p.readVarint(); const v=p.readVarint(); t[k]=v; }
 return t; }

function readGeometry(p){ const e=p.readVarint()+p.pos; const g=[];
 while(p.pos<e) g.push(p.readVarint()); return g; }

function vectorTileFeatureToGeoJSON(f,l){ const ext=l.extent||4096;
 const geom=decodeGeometry(f,ext); return {id:f.id,type:'Feature',geometry:geom,tags:f.tags}; }

function decodeGeometry(f,ext){ const c=f.geometry; let x=0,y=0; const lines=[]; let line=[]; let i=0;
 while(i<c.length){ const cmd=c[i++]&7; const cnt=c[i++]>>3;
  if(cmd===1){ for(let j=0;j<cnt;j++){ x+=zigzag(c[i++]); y+=zigzag(c[i++]); if(line.length){lines.push(line); line=[];} line.push([x/ext,y/ext]); }}
  else if(cmd===2){ for(let j=0;j<cnt;j++){ x+=zigzag(c[i++]); y+=zigzag(c[i++]); line.push([x/ext,y/ext]); }} }
 if(line.length) lines.push(line);
 return {type:'MultiLineString',coordinates:lines}; }

function zigzag(n){ return (n>>1)^(-(n&1)); }

class Pbf{ constructor(b){ this.buf=b; this.pos=0; this.length=b.length; }
 readFields(r,res){ while(this.pos<this.length){ const v=this.readVarint(); const t=v>>3; r(t,res,this);} return res; }
 readVarint(){ let v=0,sh=0,b; do{ b=this.buf[this.pos++]; v|=(b&0x7f)<<sh; sh+=7;}while(b>=0x80); return v; }
 readString(){ const len=this.readVarint(); const s=this.pos; this.pos+=len; return new TextDecoder().decode(this.buf.subarray(s,s+len)); }
 readFloat(){ const v=new DataView(this.buf.buffer).getFloat32(this.pos,true); this.pos+=4; return v; }
 readDouble(){ const v=new DataView(this.buf.buffer).getFloat64(this.pos,true); this.pos+=8; return v; }
 readMessage(r,res){ const e=this.readVarint()+this.pos; while(this.pos<e){ const t=this.readVarint()>>3; r(t,res,this);} return res; }
 readSVarint(){ return this.readVarint(); }
}
