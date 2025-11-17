export function lonLatToWorld(lon,lat){
  const R=6378137;
  const x=R*lon*Math.PI/180;
  const y=R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  return [x,y];
}
