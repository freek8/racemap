export function createThreeTerrainLayer(map,model,onLoad){
  let scene=new THREE.Scene();
  let camera=new THREE.Camera();
  let renderer;
  const loader=new THREE.GLTFLoader();

  loader.load(model,(g)=>{
    const car=g.scene;
    scene.add(car);
    onLoad(car);
  });

  return {
    id:"three-terrain",
    type:"custom",
    renderingMode:"3d",
    onAdd(map,gl){
      renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});
      renderer.autoClear=false;
      this.renderer=renderer;
      this.scene=scene;
      this.camera=camera;
    },
    render(gl,matrix){
      this.camera.projectionMatrix=new THREE.Matrix4().fromArray(matrix);
      this.renderer.state.reset();
      this.renderer.render(this.scene,this.camera);
      map.triggerRepaint();
    }
  };
}
