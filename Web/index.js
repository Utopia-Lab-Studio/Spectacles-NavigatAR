// Initialize and add the map
let map;

var currLat;
var currLng;
var srcLat;
var srcLng;
var destLat;
var destLng;
var zoom_Level;


function getParameters() {
	let urlString = window.location.href;
	let paramString = urlString.split('?')[1];
	let queryString = new URLSearchParams(paramString);
	//console.log(queryString.get('a'));		// api key
	currLat = queryString.get('b');		
	currLng = queryString.get('c');		
	srcLat = queryString.get('d');
	srcLng = queryString.get('e');
	destLat = queryString.get('f');
	destLng = queryString.get('g');
	zoom_Level = queryString.get('h');
}

async function initMap() {
	
  getParameters();
  
  // The location of Uluru
  const position = { lat: Number(currLat), lng: Number(currLng) };
  const src = { lat: Number(srcLat), lng: Number(srcLng) };
  const dest = { lat: Number(destLat), lng: Number(destLng) };

  // Request needed libraries.
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();

  // The map, centered at Uluru
  map = new Map(document.getElementById("map"), {
    zoom: parseInt(zoom_Level, 10),
    center: position,
	zoomControl: true,
    mapId: "DEMO_MAP_ID",
  });
  directionsRenderer.setMap(map);
  
  // The marker, positioned at Uluru
  const marker = new AdvancedMarkerElement({
    map: map,
    position: position,
    title: "start",
  });
  

  var request = {
    origin: src,
    destination: dest,
    travelMode: 'WALKING'
  };
  directionsService.route(request, function(result, status) {
    if (status == 'OK') {
      directionsRenderer.setDirections(result);
	  //map.setZoom(parseInt(zoom_Level, 10));
	  //directionsRenderer.setMap(map);
    }
  });
  
}

initMap();