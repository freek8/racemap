// Smooth chase camera controller

export class CameraController{
 constructor(threeLayer,carController){
  this.layer=threeLayer;
  this.car=carController;
  this.smoothPos={x:0,y:0,z:0};
  this.smoothRot=0;
  this.followSpeed=0.12;
 }

 update(){
  if(!this.car||!this.car.obj) return;

  const t=this.car.getChaseTarget();
  const p=t.position;
  const rot=t.rotation.z;

  this.smoothPos.x+= (p.x-this.smoothPos.x)*this.followSpeed;
  this.smoothPos.y+= (p.y-this.smoothPos.y)*this.followSpeed;
  this.smoothPos.z+= (p.z-this.smoothPos.z)*this.followSpeed;
  this.smoothRot+= (rot-this.smoothRot)*this.followSpeed;

  this.layer.setChaseTarget({
    position:new THREE.Vector3(
      this.smoothPos.x,
      this.smoothPos.y,
      this.smoothPos.z
    ),
    rotation:{z:this.smoothRot}
  });
 }
}
