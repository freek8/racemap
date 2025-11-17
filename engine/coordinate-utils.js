// Coordinate conversions for lon/lat, mercator, tiles

const R=6378137;
const D2R=Math.PI/180;
const R2D=180/Math.PI;

export function lonLatToMerc(lon,lat){
 const x=R*lon*D2R;
 const y=R*Math.log(Math.tan(Math.PI/4+lat*D2R/2));
 return {x,y}; }

export function mercToLonLat(x,y){
 const lon=x*R2D/R;
 const lat=(Math.atan(Math.exp(y/R))-Math.PI/4)*2*R2D;
 return {lon,lat}; }

export function lonLatToTile(lon,lat,z){
 const s=1<<z;
 const tx=(lon+180)/360*s;
 const ty=(1-Math.log(Math.tan(lat*D2R)+1/Math.cos(lat*D2R))/Math.PI)/2*s;
 return {x:tx,y:ty}; }

export function tileToLonLat(x,y,z){
 const s=1<<z;
 const lon=x/s*360-180;
 const n=Math.PI-2*Math.PI*y/s;
 const lat=R2D*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
 return {lon,lat}; }

export function normalizePointInTile(lon,lat,z){
 const t=lonLatToTile(lon,lat,z);
 const tx=Math.floor(t.x), ty=Math.floor(t.y);
 return {nx:t.x-tx, ny:t.y-ty, tx, ty}; }

export function normalizedToLonLat(tx,ty,nx,ny,z){
 const s=1<<z;
 const lon=(tx+nx)/s*360-180;
 const n=Math.PI-2*Math.PI*(ty+ny)/s;
 const lat=R2D*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
 return {lon,lat}; }

export function tileURL(tmpl,z,x,y){
 return tmpl.replace('{z}',z).replace('{x}',x).replace('{y}',y);
}
