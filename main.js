import { createThreeTerrainLayer } from './engine/three-layer.js';
import { CarController } from './engine/car-controller.js';
import { CameraController } from './engine/camera-controller.js';

const start=[6.5665,53.2194];

const map=new maplibregl.Map({
  container:'map',
  style:{
    version:8,
    sources:{
      sat:{
        type:'raster',
        tiles:['https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=84I0brm1Nz3hhuwn2JP4'],
        tileSize:256
      },
      terrainSource:{
        type:'raster-dem',
        tiles:['https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.png?key=84I0brm1Nz3hhuwn2JP4'],
        tileSize:256,
        maxzoom:14
      }
    },
    layers:[{id:'sat',type:'raster',source:'sat'}],
    terrain:{source:'terrainSource',exaggeration:1.0}
  },
  center:start,
  zoom:16,
  pitch:60,
  bearing:-20
});

let threeLayer,car,cameraCtrl;

map.on('load',()=>{
  threeLayer=createThreeTerrainLayer(map,'car.glb',(obj)=>{
    car=new CarController(obj,start,map);
    cameraCtrl=new CameraController(map,obj);
  });
  map.addLayer(threeLayer);
});
