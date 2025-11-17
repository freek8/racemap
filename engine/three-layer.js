// Three.js inside MapLibre custom 3D layer

export class ThreeTerrainLayer{
 constructor(modelPath,callback){
  this.id='three-terrain-layer';
  this.type='custom';
  this.renderingMode='3d';
  this.modelPath=modelPath;
  this.onModelLoaded=callback;
  this.scene=null;
  this.camera=null;
  this.renderer=null;
  this.car=null;
  this.chaseTarget=null;
 }

 onAdd(map,gl){
  this.map=map;
  this.renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});
  this.renderer.autoClear=false;
  this.scene=new THREE.Scene();
  this.camera=new THREE.Camera();

  const loader=new THREE.GLTFLoader();
  loader.load(this.modelPath,(gltf)=>{
    this.car=gltf.scene;
    this.scene.add(this.car);
    if(this.onModelLoaded) this.onModelLoaded(this.car);
  });
 }

 setChaseTarget(t){ this.chaseTarget=t; }

 render(gl,matrix){
  if(!this.car) return;

  this.camera.projectionMatrix.fromArray(matrix);

  if(this.chaseTarget){
    const p=this.chaseTarget.position;
    const rot=this.chaseTarget.rotation.z;

    const dist=45;
    const height=22;

    const cx=p.x-Math.cos(rot)*dist;
    const cy=p.y-Math.sin(rot)*dist;
    const cz=p.z+height;

    this.camera.matrixWorld.makeTranslation(cx,cy,cz);
    this.camera.matrixWorldNeedsUpdate=true;
  }

  this.renderer.state.reset();
  this.renderer.render(this.scene,this.camera);
  this.map.triggerRepaint();
 }
}
