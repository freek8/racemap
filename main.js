// MapLibre setup
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [6.5665, 53.2194],
  zoom: 16,
  pitch: 60,
  bearing: -20
});

let scene, renderer, camera, car;

// Create ThreeJS scene upon map load
map.on('load', () => {
  console.log('Racemap 3D v1.2 Loaded');

  const canvas = map.getCanvas();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.autoClear = false;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

  const loader = new THREE.GLTFLoader();
  loader.load('car.glb', (gltf) => {
    car = gltf.scene;
    car.scale.set(5, 5, 5);
    scene.add(car);
  });

  animate();
});

function animate() {
  requestAnimationFrame(animate);

  if (car) {
    car.rotation.y += 0.01; // simple animation
  }

  renderer.state.reset();
  renderer.render(scene, camera);
}
