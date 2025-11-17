import { lonLatToWorld } from './coordinate-utils.js';

export class CarController{
  constructor(obj,start,map){
    this.obj=obj;
    this.lon=start[0];
    this.lat=start[1];
    this.map=map;
    this.dir=0;
    this.speed=0;
    this.keys={};
    window.addEventListener('keydown',e=>this.keys[e.key]=true);
    window.addEventListener('keyup',e=>this.keys[e.key]=false);
    this.scaled=false;
  }

  update(){
    if(this.keys['w']) this.speed=0.0003;
    else this.speed=0;

    if(this.keys['a']) this.dir+=0.02;
    if(this.keys['d']) this.dir-=0.02;

    this.lon+=Math.cos(this.dir)*this.speed;
    this.lat+=Math.sin(this.dir)*this.speed;

    const h=this.map.queryTerrainElevation([this.lon,this.lat])||0;
    const [x,y]=lonLatToWorld(this.lon,this.lat);
    this.obj.position.set(x,y,h);

    this.obj.rotation.z=-this.dir;

    if(!this.scaled){
      const box=new THREE.Box3().setFromObject(this.obj);
      const size=new THREE.Vector3();
      box.getSize(size);
      const target=4;
      const scale=target/Math.max(size.x,size.y,size.z);
      this.obj.scale.set(scale,scale,scale);
      this.scaled=true;
    }
  }
}
