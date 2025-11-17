const map = new maplibregl.Map({
  container: 'map',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [6.5665, 53.2194],
  zoom: 14,
  pitch: 60,
  bearing: -20
});

map.on('load', () => {
  console.log('Racemap 3D map loaded.');
});
