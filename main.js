import { createThreeLayer } from './engine/three-layer.js';
import { CarController } from './engine/car-controller.js';
import { CameraController } from './engine/camera-controller.js';

const startPos = [6.5665, 53.2194];

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: startPos,
  zoom: 17,
  pitch: 60,
  bearing: -20
});

let threeLayer, car, cameraCtrl;

map.on('load', () => {
  threeLayer = createThreeLayer(map, 'car.glb', (carObj)=>{
    car = new CarController(carObj, startPos);
    cameraCtrl = new CameraController(map, carObj);
  });
  map.addLayer(threeLayer);
});

function loop(){
  requestAnimationFrame(loop);
  if(car) car.update();
  if(cameraCtrl) cameraCtrl.update();
}
loop();
