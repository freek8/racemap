// Magnetic snapping to nearest road polyline
export class RoadSnapper{
 constructor(){ this.roads=[]; this.snapStrength=0.85; }
 setRoads(r){ this.roads=r; }

 snapPosition(x,y){
  if(!this.roads.length) return {x,y,dir:{x:1,y:0}};
  let best=1e12, bx=x, by=y, bdir={x:1,y:0};
  for(let seg of this.roads){
   for(let i=0;i<seg.length-1;i++){
    const p0=seg[i], p1=seg[i+1];
    const px=p0[0], py=p0[1]; const qx=p1[0], qy=p1[1];
    const vx=qx-px, vy=qy-py; const wx=x-px, wy=y-py;
    const c1=wx*vx+wy*vy; const c2=vx*vx+vy*vy;
    let t=0; if(c2>0) t=c1/c2; if(t<0)t=0; if(t>1)t=1;
    const cx=px+t*vx, cy=py+t*vy;
    const dx=x-cx, dy=y-cy; const d=dx*dx+dy*dy;
    if(d<best){ best=d; bx=cx; by=cy;
      const len=Math.sqrt(vx*vx+vy*vy)||1;
      bdir={x:vx/len,y:vy/len};
    }
   }
  }
  const sx=x*(1-this.snapStrength)+bx*this.snapStrength;
  const sy=y*(1-this.snapStrength)+by*this.snapStrength;
  return {x:sx,y:sy,dir:bdir};
 }
}
