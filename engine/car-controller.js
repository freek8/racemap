// Car movement, road snapping, terrain following
import { lonLatToMerc, normalizePointInTile, normalizedToLonLat } from './coordinate-utils.js';

export class CarController{
 constructor(model,startLonLat,map,roadSnapper){
  this.obj=model;
  this.map=map;
  this.snapper=roadSnapper;

  this.lon=startLonLat[0];
  this.lat=startLonLat[1];

  const m=lonLatToMerc(this.lon,this.lat);
  this.x=m.x; this.y=m.y; this.z=0;

  this.dir=0;
  this.speed=0;

  this.keys={};
  window.addEventListener('keydown',e=>this.keys[e.key.toLowerCase()]=true);
  window.addEventListener('keyup',e=>this.keys[e.key.toLowerCase()]=false);

  this.scaled=false;
  this.tileZ=16;
 }

 update(){
  this.handleInput();
  this.applyMovement();
  this.snapToRoad();
  this.sampleTerrain();
  this.updateModel();
 }

 handleInput(){
  if(this.keys['w']) this.speed=35;
  else if(this.keys['s']) this.speed=-20;
  else this.speed=0;

  if(this.keys['a']) this.dir+=0.04;
  if(this.keys['d']) this.dir-=0.04;
 }

 applyMovement(){
  const dx=Math.cos(this.dir)*this.speed;
  const dy=Math.sin(this.dir)*this.speed;

  this.x+=dx; this.y+=dy;

  const p1=this.map.project([this.lon,this.lat]);
  const p2={x:p1.x+dx,y:p1.y+dy};
  const ll=this.map.unproject([p2.x,p2.y]);
  this.lon=ll.lng; this.lat=ll.lat;
 }

 snapToRoad(){
  const t=normalizePointInTile(this.lon,this.lat,this.tileZ);
  const s=this.snapper.snapPosition(t.nx,t.ny);
  const ll=normalizedToLonLat(t.tx,t.ty,s.x,s.y,this.tileZ);
  this.lon=ll.lon; this.lat=ll.lat;

  const m=lonLatToMerc(this.lon,this.lat);
  this.x=m.x; this.y=m.y;

  this.dir=Math.atan2(s.dir.y,s.dir.x);
 }

 sampleTerrain(){
  const h=this.map.queryTerrainElevation([this.lon,this.lat]);
  this.z=h||0;
 }

 updateModel(){
  this.obj.position.set(this.x,this.y,this.z);
  this.obj.rotation.z=-this.dir;

  if(!this.scaled){
   const box=new THREE.Box3().setFromObject(this.obj);
   const size=new THREE.Vector3(); box.getSize(size);
   const scale=4/Math.max(size.x,size.y,size.z);
   this.obj.scale.set(scale,scale,scale);
   this.scaled=true;
  }
 }

 getChaseTarget(){
  return {position:this.obj.position,rotation:this.obj.rotation};
 }
}
