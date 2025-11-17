// Terrain elevation smoothing helper

export class TerrainHelper{
 constructor(map){
  this.map=map;
  this.lastHeights={};
  this.smoothFactor=0.3;
 }

 getElevation(lon,lat){
  const key=lon.toFixed(6)+","+lat.toFixed(6);
  const raw=this.map.queryTerrainElevation([lon,lat]);
  const h=raw||0;

  if(!(key in this.lastHeights)){
   this.lastHeights[key]=h;
   return h;
  }

  const prev=this.lastHeights[key];
  const smooth=prev+(h-prev)*this.smoothFactor;
  this.lastHeights[key]=smooth;
  return smooth;
 }
}
