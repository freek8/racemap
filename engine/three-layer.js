import { lonLatToWorld } from './coordinate-utils.js';

export function createThreeLayer(map, modelPath, onLoad){
  let scene = new THREE.Scene();
  let camera = new THREE.Camera();
  let loader = new THREE.GLTFLoader();
  let carObj = null;

  loader.load(modelPath, (g)=> {
    carObj = g.scene;
    carObj.scale.set(5,5,5);
    scene.add(carObj);
    onLoad(carObj);
  });

  const layer = {
    id: 'threejs-layer',
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl){
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      });
      this.renderer.autoClear = false;
    },
    render(gl, matrix){
      const m = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = m;
      this.renderer.state.reset();
      this.renderer.render(scene, camera);
    },
    scene,
    camera
  };
  return layer;
}
