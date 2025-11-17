export class CameraController{
  constructor(map,car){
    this.map=map;
    this.car=car;
  }
  update(){
    if(!this.car)return;
    const p=this.car.position;
    const R=6378137;
    const lon=p.x/R*180/Math.PI;
    const lat=(2*Math.atan(Math.exp(p.y/R))-Math.PI/2)*180/Math.PI;
    this.map.setCenter([lon,lat]);
  }
}
