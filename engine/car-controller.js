import { lonLatToWorld } from './coordinate-utils.js';

export class CarController{
  constructor(carObj, startLonLat){
    this.obj = carObj;
    this.lon = startLonLat[0];
    this.lat = startLonLat[1];
    this.speed = 0;
    this.dir = 0;

    window.addEventListener('keydown', (e)=>this.key(e,true));
    window.addEventListener('keyup', (e)=>this.key(e,false));
    this.keys = {};
  }

  key(e,down){ this.keys[e.key.toLowerCase()] = down; }

  update(){
    if(this.keys['w']) this.speed = 0.0001;
    else this.speed = 0;
    if(this.keys['a']) this.dir += 0.02;
    if(this.keys['d']) this.dir -= 0.02;

    this.lon += Math.cos(this.dir)*this.speed;
    this.lat += Math.sin(this.dir)*this.speed;

    const pos = lonLatToWorld(this.lon, this.lat);
    this.obj.position.set(pos[0], pos[1], 0);
    this.obj.rotation.z = -this.dir;
  }
}
