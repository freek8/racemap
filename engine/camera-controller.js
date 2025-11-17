export class CameraController{
  constructor(map, carObj){
    this.map = map;
    this.car = carObj;
  }
  update(){
    if(!this.car) return;
    const p = this.car.position;
    this.map.setCenter([p.x, p.y]);
  }
}
