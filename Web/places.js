// Initialize and add the map
let map;

var currLat;
var currLng;
var lat_1;
var lng_1;
var lat_2;
var lng_2;
var lat_3;
var lng_3;
var lat_4;
var lng_4;
var lat_5;
var lng_5;
var zoom_Level;



function getParameters() {
	let urlString = window.location.href;
	let paramString = urlString.split('?')[1];
	let queryString = new URLSearchParams(paramString);
	//console.log(queryString.get('a'));		// api key
	currLat = queryString.get('b');		
	currLng = queryString.get('c');		
	lat_1 = queryString.get('d');
	lng_1 = queryString.get('e');
	lat_2 = queryString.get('f');
	lng_2 = queryString.get('g');
	lat_3 = queryString.get('h');
	lng_3 = queryString.get('i');
	lat_4 = queryString.get('j');
	lng_4 = queryString.get('k');
	lat_5 = queryString.get('l');
	lng_5 = queryString.get('m');
	zoom_Level = queryString.get('n');
	
}

async function initMap() {
	
  getParameters();
  
  // The location of Uluru
  const position = { lat: Number(currLat), lng: Number(currLng) };


  // Request needed libraries.
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
  

  // The map, centered at Uluru
  map = new Map(document.getElementById("map"), {
    zoom: parseInt(zoom_Level, 10),
    center: position,
	zoomControl: true,
    mapId: "DEMO_MAP_ID",
  });

   // const markerViewWithText = new AdvancedMarkerElement({
    // map,
    // position: position,
    // title: "Title text for the marker at lat: 37.419, lng: -122.03",
  // });
  
  // The marker,
  if(Number(lat_1) < 100){
	  const pinTextGlyph = new PinElement({
		glyph: "1",
		glyphColor: "white",
	  });
	  const marker = new AdvancedMarkerElement({
		map: map,
		position: { lat: Number(lat_1), lng: Number(lng_1) },
		content: pinTextGlyph.element,
	  }); 
  }
  if(Number(lat_2) < 100){
	  const pinTextGlyph = new PinElement({
		glyph: "2",
		glyphColor: "white",
	  });
	  const marker = new AdvancedMarkerElement({
		map: map,
		position: { lat: Number(lat_2), lng: Number(lng_2) },
		content: pinTextGlyph.element,
	  });
  }
  if(Number(lat_3) < 100){
	  const pinTextGlyph = new PinElement({
		glyph: "3",
		glyphColor: "white",
	  });
	  const marker = new AdvancedMarkerElement({
		map: map,
		position: { lat: Number(lat_3), lng: Number(lng_3) },
		content: pinTextGlyph.element,
	  });
  }
  if(Number(lat_4) < 100){
	  const pinTextGlyph = new PinElement({
		glyph: "4",
		glyphColor: "white",
	  });
	  const marker = new AdvancedMarkerElement({
		map: map,
		position: { lat: Number(lat_4), lng: Number(lng_4) },
		content: pinTextGlyph.element,
	  });
  }
  if(Number(lat_5) < 100){
	  const pinTextGlyph = new PinElement({
		glyph: "5",
		glyphColor: "white",
	  });
	  const marker = new AdvancedMarkerElement({
		map: map,
		position: { lat: Number(lat_5), lng: Number(lng_5) },
		content: pinTextGlyph.element,
	  });
  }

}

initMap();