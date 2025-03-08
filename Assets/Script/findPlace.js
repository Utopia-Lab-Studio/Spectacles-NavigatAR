

//@input Asset.RemoteServiceModule remoteServiceModule
const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionConfiguration = SIK.InteractionConfiguration;
const WebView = require('Web View/WebView').WebView;


// gps module
var remoteServiceModule = script.remoteServiceModule;
require("LensStudio:RawLocationModule");
let locationService = null;

//@ui {"widget":"group_start", "label":"API key & web URL"}
// @input string API_key
// @input string route_URL
// @input string nearby_URL
//@ui {"widget":"group_end"}


//@ui {"widget":"group_start", "label":"Scripts references"}
// @input Component.ScriptComponent voice_Script
// @input Component.ScriptComponent mapComponent
// @input Component.ScriptComponent scroll_Script
// @input Component.ScriptComponent scrollView_Script
// @input Component.ScriptComponent scrollBar_Script
//@ui {"widget":"group_end"}

//@ui {"widget":"group_start", "label":"UIs references"}
// @input Component.Text gps_txt
// @input vec4 gpsOn = {1.0,1.0,0.0,1}
// @input vec4 gpsOff = {1.0,1.0,0.0,1}
// @input SceneObject dirUI_obj
// @input Component.Text instruct_txt
// @input SceneObject arrow_UI
// @input SceneObject sign_UI
// @input SceneObject plane_obj
// @input SceneObject turn_obj
// @input SceneObject turnLeft_obj
// @input SceneObject turnRight_obj
// @input SceneObject goal_obj
// @input SceneObject webmap_obj
// @input Component.Text voice_txt
// @input SceneObject rotLeft_obj
// @input SceneObject rotRight_obj
// @input Component.Text dest_txt
// @input Component.Text map_txt
// @input SceneObject start_button
// @input SceneObject north_panel
// @input SceneObject hint_panel
// @input Component.Material unlit_mat
// @input Component.Material rainbow_mat
// @input SceneObject hand_obj
// @input SceneObject consent_panel
//@ui {"widget":"group_end"}

// set to true: to simulate walking in lens studio, set to false: when push to Spectalces
global.Debug = false;

// persistant storage consent
var store = global.persistentStorageSystem.store;
var consentKey = 'consent';
global.startApp = false;

// map data
global.hasCityName = 0;
var cityName;
global.lat = 34.01630;			// snap hq
global.lng = -118.45349;
global.heading = 0;
global.voiceCmd = "";
global.hindHint = false;		// voice recognition text
global.setHeadingOnce = false;
global.isHeadingAvailable = false;

// nearby places data
const placesLat = [];
const placesLon = [];
const placesName = [];
const placesDist = [];

// navigation data
const instructionStep = [];		// main step
const distanceStep = [];		// main step
var routeDuration;
var routeDistance;
// finest step 
//		walk: (start gps, end gps, walk)
//		transit: (start gps, end gps, transit, start stop, end stop, headsign)
//		skip step if start gps=end gps
const routeSegment = [];		// navigation path
var segmentIdx = 0;		
var reachDestination = false;
global.naviState = 0;			// 0: path state,  1: junction state
global.turnSuccess = false;
global.pathAngle = 0;			// the angle between the current route segment and the next segment
global.destName = "";
global.pathReady = false;		// if true, start navi button enable
script.navigating = false;		// interop varaible to handtrack.ts

// use only in sim mode
global.startLat = 0;
global.startLng = 0;
global.startDeviceX = 0;
global.startDeviceZ = 0;




//////////////////////////////////
//--- Helper func
//////////////////////////////////

function deg2rad(deg) {
  return deg * (Math.PI/180)
}


function distLatLng(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c * 1000; // Distance in meter
  return d;
}


// returns 1 if otherAngle is 15 deg to the right of sourceAngle,
//         0 if the angles are identical
//         -1 if otherAngle is 15 deg to the left of sourceAngle
function compareAngles(sourceAngle, otherAngle)
{
    // convert sourceAngle and otherAngle from [0,360] to [-180,180]
    if(sourceAngle > 180){
    	sourceAngle = sourceAngle - 360;
    }
    if(otherAngle > 180){
    	otherAngle = otherAngle - 360;
    }
    var difference = otherAngle - sourceAngle;

    if(difference < -180.0)
        difference += 360.0;
    if(difference > 180.0)
        difference -= 360.0;

    if(difference > 15)
        return 1;
    if(difference < -15)
        return -1;

    return 0;
}

// return in degree unit
function angleFromCoordinate(lat1,lon1,lat2,lon2) {
    var p1 = {
        x: lat1,
        y: lon1
    };

    var p2 = {
        x: lat2,
        y: lon2
    };
    // angle in radians
    var angleRadians = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // angle in degrees
    var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

    return angleDeg;   
}


// snapGPS point to route segment line for a better location accuracy
function snapGPS(input_latlng){
	var aby = routeSegment[segmentIdx].endLat - routeSegment[segmentIdx].startLat;
	var abx = routeSegment[segmentIdx].endLng - routeSegment[segmentIdx].startLng;
	var acy = input_latlng.lat - routeSegment[segmentIdx].startLat;
	var acx = input_latlng.lng - routeSegment[segmentIdx].startLng;

	var coeff = (abx*acx + aby*acy) / (abx*abx+aby*aby)
	dx = routeSegment[segmentIdx].startLng + abx * coeff
	dy = routeSegment[segmentIdx].startLat + aby * coeff

	return {lat: dy, lng: dx};
}



//////////////////////////////////
//--- Main functionality
//////////////////////////////////


// main logic for drawing AR objects for navigation 
function drawArrowUI(curr_lat, curr_lng){
	//1. find dist to end point
	var distToEndPoint = distLatLng(routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng,
									curr_lat,curr_lng);
	print(segmentIdx + ": " + distToEndPoint.toFixed(5) + " " + routeSegment.length.toFixed(5));
	//print(curr_lat.toFixed(5) + " , " + curr_lng.toFixed(5));
	
	//2. state = 0: path state
	// state = 1: junction state
	if(global.naviState == 0){
		// change to junction state when dist < 30m, not the last segment
			// play sound once
			// show turn, fix pos
		if((segmentIdx+1) < (routeSegment.length)){
			if(distToEndPoint < 30){
				global.naviState = 1;
				print("enter junction state");
				script.sign_UI.getTransform().setWorldPosition(global.deviceTransform.getWorldPosition());
				var angle = angleFromCoordinate(routeSegment[segmentIdx].startLat,routeSegment[segmentIdx].startLng, 
												routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng);
				var adjustAngle = ((angle + global.currentHeading)+360) % 360;
				var angleRad = adjustAngle * Math.PI/180;
				var dx = Math.sin(angleRad) * 100 * distToEndPoint;
				var dz = Math.cos(angleRad) * -100 * distToEndPoint;

				script.turn_obj.getTransform().setLocalPosition(new vec3(dx,-50,dz));

				if(instructionStep[segmentIdx+1].includes("right")){
					script.turnLeft_obj.enabled = false;
					script.turnRight_obj.enabled = true;
					global.getTTSResults("turn right at the junction"); 
				}else{
					script.turnLeft_obj.enabled = true;
					script.turnRight_obj.enabled = false;
					global.getTTSResults("turn left at the junction"); 
				}
				var rotationToApply = quat.fromEulerAngles(Math.PI/2,-angleRad,0);
				//print(-angleRad + " " + angleZ);

				script.turn_obj.getTransform().setLocalRotation(rotationToApply);
				script.turn_obj.enabled = true;
			}
		}else if((segmentIdx+1) == (routeSegment.length)){
			if(distToEndPoint < 10){
				global.naviState = 2;
				reachDestination = true;
				print("reach destination :D");
				global.getTTSResults("you have reach the destination"); 
			}
		}
	} else{
		// change to path state, when user rot 90 for 2 sec 
			// update to next segment 
			// hide turn
		if(global.turnSuccess){
			global.naviState = 0;
			global.turnSuccess = false;
			global.startTimer = false;

			print("enter next segment");

			segmentIdx++;

			drawMapPin();
			// update directions
			script.scroll_Script.cmd_destroyList();
			script.scroll_Script.cmd_createList(routeSegment.length, instructionStep, distanceStep,segmentIdx);
			script.scrollView_Script.recomputeBoundaries();

			script.turn_obj.enabled = false;
			script.goal_obj.enabled = false;
			distToEndPoint = distLatLng(routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng,
									curr_lat,curr_lng);
			//print(segmentIdx + ": " + distToEndPoint.toFixed(5) + " " + routeSegment.length.toFixed(5));
			//print(curr_lat.toFixed(5) + " , " + curr_lng.toFixed(5));	
			// update global.pathAngle
			var angle = angleFromCoordinate(routeSegment[segmentIdx].startLat,routeSegment[segmentIdx].startLng, 
									routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng);
			var adjustAngle = ((angle + global.currentHeading)+360) % 360;
			global.pathAngle = adjustAngle;
		}
	}

	//3. show arrow path
	script.arrow_UI.getTransform().setWorldPosition(global.deviceTransform.getWorldPosition());
	script.plane_obj.enabled = true;
	var angle = angleFromCoordinate(routeSegment[segmentIdx].startLat,routeSegment[segmentIdx].startLng, 
									routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng);
	var adjustAngle = ((angle + global.currentHeading)+360) % 360;
	var angleRad = adjustAngle * Math.PI/180;
	var dx = Math.sin(angleRad) * 1000;
	var dz = Math.cos(angleRad) * -1000;
	script.plane_obj.getTransform().setLocalPosition(new vec3(dx,-150,dz));
	var rotationToApply = quat.angleAxis(-angleRad, vec3.up());
	script.plane_obj.getTransform().setLocalRotation(rotationToApply);

	print(global.device_angle + " " +  adjustAngle);

	//4. show rotLeft,rotRight if needed
	if (compareAngles(global.device_angle, adjustAngle) == -1){
		script.rotLeft_obj.enabled = true;
		script.rotRight_obj.enabled = false;
	}else if (compareAngles(global.device_angle, adjustAngle) == 1){
		script.rotLeft_obj.enabled = false;
		script.rotRight_obj.enabled = true;
	}else{
		script.rotLeft_obj.enabled = false;
		script.rotRight_obj.enabled = false;
	} 

	//5. draw dest pin only when (<40m), last segment
	if((segmentIdx+1) == (routeSegment.length)){
		if(distToEndPoint < 40){
			//if(!script.goal_obj.enabled){
				script.sign_UI.getTransform().setWorldPosition(global.deviceTransform.getWorldPosition());
				script.goal_obj.enabled = true;
				var angle = angleFromCoordinate(routeSegment[segmentIdx].startLat,routeSegment[segmentIdx].startLng, 
											 routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng);
				var adjustAngle = ((angle + global.currentHeading)+360) % 360;
				var angleRad = adjustAngle * Math.PI/180;
				var dx = Math.sin(angleRad) * 100 * distToEndPoint;
				var dz = Math.cos(angleRad) * -100 * distToEndPoint;

				script.goal_obj.getTransform().setLocalPosition(new vec3(dx,0,dz));
				var rotationToApply = quat.fromEulerAngles(0,-angleRad,0);
				script.goal_obj.getTransform().setLocalRotation(rotationToApply);
			//}
		}else{
			script.goal_obj.enabled = false;
		}
	}
}

// call once in updateGPS()
script.findCurrentCity = function(){
	let httpRequest = RemoteServiceHttpRequest.create();
    httpRequest.url = 'https://maps.googleapis.com/maps/api/geocode/json?' + 
        'key=' + script.API_key + '&latlng=' + global.lat + ',' + global.lng +
        //'&result_type=administrative_area_level_1';
        '&result_type=locality';
    httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;

    remoteServiceModule.performHttpRequest(httpRequest, (response) => {
		if (response.statusCode === 200) {
		    // Check if the response status is 200 (OK)
		    const obj = JSON.parse(response.body);

			cityName = obj.results[0].formatted_address;
			print(cityName);

			// show current loc on the map
			var destUrl = script.route_URL + 
							'?a=' + script.API_key +
					        '&b=' + global.lat.toFixed(5) +
					        '&c=' + global.lng.toFixed(5) +
					        '&d=' + global.lat.toFixed(5) +
					        '&e=' + global.lng.toFixed(5) +
					        '&f=' + global.lat.toFixed(5) +
					        '&g=' + global.lng.toFixed(5) +
							'&h=18';
			script.webmap_obj.getComponent(WebView.getTypeName()).url = destUrl;
		}
    });
}


// called every 1 sec, use new GPS data to update variables
script.updateGPS = function (){
	// do once
	if(!global.hasCityName){
		script.findCurrentCity();
		global.hasCityName = 1;
	}
	
	// sim mode: update gps based on device pos, not test with adjust heading
	var pos_dx = global.deviceTransform.getWorldPosition().x - global.startDeviceX;
	var pos_dz = global.deviceTransform.getWorldPosition().z - global.startDeviceZ;
	var rotRad = global.currentHeading * Math.PI / 180 ;
	var pos_dx_rot = pos_dx*Math.cos(-rotRad) - pos_dz*Math.sin(-rotRad);
	var pos_dz_rot = pos_dx*Math.sin(-rotRad) + pos_dz*Math.cos(-rotRad);
	var lng_dt = 0.00001 * pos_dx_rot/111;
	var lat_dt = 0.00001 * pos_dz_rot/-111;
	var input_latlng = {lat: global.startLat + lat_dt,
						lng: global.startLng + lng_dt};

	// not perform this on real device
	if(!global.Debug){
		input_latlng = {lat: global.lat,
						lng: global.lng};
	}
	
	// snapGPS to road, 
	// only do when user ask for dir
	if(routeSegment.length > 0){
		if(!reachDestination){
			if(script.arrow_UI.enabled){
				//print(input_latlng.lat.toFixed(5) + " , " + input_latlng.lng.toFixed(5));
				var snap_latlng = snapGPS(input_latlng);
				drawArrowUI(snap_latlng.lat, snap_latlng.lng);
			}
		}
	}
}

// called when user agree on consent
script.cmd_startApp = function (){
	global.startApp = true;
	store.putBool(consentKey,true);
	script.consent_panel.enabled = false;
}

const repeatUpdateUserLocation = script.createEvent('DelayedCallbackEvent');

repeatUpdateUserLocation.bind(() => {
	// Get users location.
	locationService.getCurrentPosition(
	  function (geoPosition) {
			if(global.startApp){
				global.lat = geoPosition.latitude;
				global.lng = geoPosition.longitude;

				// gps txt notice
				script.gps_txt.textFill.color = script.gpsOn;
				script.gps_txt.enabled = false;

				// paseo 13.76662, 100.40648
				// siam 13.74476, 100.53279
				if (global.Debug){
					global.lat = 13.74455;
					global.lng = 100.53255;
				}

				if(!global.isHeadingAvailable){
					if(!global.setHeadingOnce){
						global.setHeadingOnce = true;
						script.north_panel.enabled = true;
						script.hint_panel.enabled = false;    
						script.dirUI_obj.enabled = false;
						script.start_button.getChild(0).getComponent("Component.RenderMeshVisual").mainMaterial = script.unlit_mat;
						script.start_button.getComponent("Physics.ColliderComponent").enabled = false;
					}
				}
				script.updateGPS();
			}
	  },
	  function (error) {
			if(global.startApp){
				print(error);
				script.gps_txt.textFill.color = script.gpsOff;
				script.gps_txt.enabled = true;
			}
	  }
	);
	// Acquire next location update in 1 second, increase this value if required for AR visualisation purposes such as 0.5 or 0.1 seconds
	repeatUpdateUserLocation.reset(1.0);
  });


function createAndLogLocationAndHeading() {
	// Create location handler
  
	locationService = GeoLocation.createLocationService();
  
	// Set the accuracy
	locationService.accuracy = GeoLocationAccuracy.Navigation;
  
	// Acquire heading orientation updates
	var onOrientationUpdate = function (northAlignedOrientation) {
		// if(global.startApp){
		// 	if(!global.setHeadingOnce){
		// 		//Providing 3DoF north aligned rotation in quaternion form, degree unit
		// 		global.heading = GeoLocation.getNorthAlignedHeading(northAlignedOrientation);
		// 		if(global.heading < 0){
		// 			global.currentHeading = 360 + global.heading;
		// 		}else{
		// 			global.currentHeading = global.heading;
		// 		}
				
		// 		print('Heading orientation: ' + global.heading.toFixed(3));
		// 		print('Device angle: ' + global.device_angle.toFixed(3));
		// 		print('CurrenHeading: ' + global.currentHeading.toFixed(3));

		// 		global.setHeadingOnce = true;
		// 		script.hint_panel.enabled = true;    
		// 		script.dirUI_obj.enabled = true;
		// 		script.start_button.getChild(0).getComponent("Component.RenderMeshVisual").mainMaterial = script.unlit_mat;
		// 		script.start_button.getComponent("Physics.ColliderComponent").enabled = false;
		// 	}
		// }
	};
	locationService.onNorthAlignedOrientationUpdate.add(onOrientationUpdate);
  
	// Acquire next location immediately with zero delay
	repeatUpdateUserLocation.reset(0.0);
}
  

script.createEvent('OnStartEvent').bind(function() {
	// persistent store consent
	global.startApp = store.getBool(consentKey);
	print("stroage: " + global.startApp);
	if(global.startApp){
		script.consent_panel.enabled = false;
	}

	// init gps
	createAndLogLocationAndHeading();

	// init UI state
	script.arrow_UI.enabled = false;
	script.navigating = false;
	script.sign_UI.enabled = false;
})


// called when user hit start navigation button
script.startRouting = function (data){ 
	if(global.pathReady){
		// init var for routing
		global.naviState = 0;
		reachDestination = false;
		script.arrow_UI.enabled = true;
		script.navigating = true;
		script.sign_UI.enabled = true;
		script.plane_obj.enabled = false;
		script.turn_obj.enabled = false;
		script.goal_obj.enabled = false;
		script.voice_txt.enabled = false;
		script.hint_panel.enabled = false;
		// update global.pathAngle
		var angle = angleFromCoordinate(routeSegment[segmentIdx].startLat,routeSegment[segmentIdx].startLng, 
										routeSegment[segmentIdx].endLat,routeSegment[segmentIdx].endLng);
		var adjustAngle = ((angle + global.currentHeading)+360) % 360;
		global.pathAngle = adjustAngle;
		global.turnSuccess = false;

		script.dirUI_obj.enabled = false;

		// FAIL in lens studio
		script.voice_Script.disableMic();

		// use in sim only
		global.startLat = routeSegment[segmentIdx].startLat;
		global.startLng = routeSegment[segmentIdx].startLng;
		global.startDeviceX = global.deviceTransform.getWorldPosition().x;
		global.startDeviceZ = global.deviceTransform.getWorldPosition().z;
	}
}

// draw pins on minimap
function drawMapPin(){
	script.mapComponent.removeMapPins(); 
	var numpin = 0;
	var maxStep = 0;
	maxStep = segmentIdx + 5;
	if(maxStep > routeSegment.length){
		maxStep = routeSegment.length;
	}
	for(let i = segmentIdx; i < maxStep;i++){
		var dist = (routeSegment[i].startLng - routeSegment[i].endLng)*(routeSegment[i].startLng - routeSegment[i].endLng) +
					(routeSegment[i].startLat - routeSegment[i].endLat)*(routeSegment[i].startLat - routeSegment[i].endLat);
		dist = Math.sqrt(dist);
		var step = Math.floor(dist/0.0003);
		var vecx = (routeSegment[i].endLng - routeSegment[i].startLng)/dist;
		var vecy = (routeSegment[i].endLat - routeSegment[i].startLat)/dist;
		for(let j = 0; j <= step;j++){
			var stepX = vecx * 0.0003 * j;
			var stepY = vecy * 0.0003 * j;
			script.mapComponent.createMapPin(routeSegment[i].startLng + stepX, routeSegment[i].startLat + stepY);
			numpin++;
		}
		script.mapComponent.createMapPin(routeSegment[i].endLng, routeSegment[i].endLat);
		numpin++;
		print("create pin for step " + i + " numpin=" + numpin);
	}
}


// call GoogleMapApi to get&init navigation data 
function navigationRequest(url){
	let httpRequest = RemoteServiceHttpRequest.create();
    httpRequest.url = url;
    print(httpRequest.url);
    httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;
    remoteServiceModule.performHttpRequest(httpRequest, (response) => {
    	print(response.statusCode);
		if (response.statusCode === 200) {
		    // Check if the response status is 200 (OK)
		    const obj = JSON.parse(response.body);
		    print(response.body);
		    if(obj.routes[0]){
		    	routeDuration = obj.routes[0].legs[0].duration.text;
		    	routeDistance = obj.routes[0].legs[0].distance.text;

		    	//+ 2-level extract transit: usually have 3 outter step (walk,transit,walk)
		    	var numstep = obj.routes[0].legs[0].steps.length;
		    	var allStep = "Distance: " + routeDistance + ", " + "Duration: " + routeDuration + "\n";

				script.scroll_Script.cmd_destroyList();

		    	routeSegment.length = 0;
		    	for(let i = 0; i < numstep;i++){
		    		instructionStep[i] = obj.routes[0].legs[0].steps[i].html_instructions.replace(/<\/?[^>]+(>|$)/g, "");
		    		distanceStep[i] = obj.routes[0].legs[0].steps[i].distance.text;

		    		// finest step 
					//		walk: 		(start gps, end gps, mode)
					//		transit: 	(start gps, end gps, mode, start stop, end stop, headsign)
					//		skip step if start gps=end gps
		    		routeSegment[i] = {
		    			startLat: obj.routes[0].legs[0].steps[i].start_location.lat,
		    			startLng: obj.routes[0].legs[0].steps[i].start_location.lng,
		    			endLat: obj.routes[0].legs[0].steps[i].end_location.lat,
		    			endLng: obj.routes[0].legs[0].steps[i].end_location.lng,
		    			mode: obj.routes[0].legs[0].steps[i].travel_mode
		    		};
		    	}

				print("numstep: " + numstep);
		    	segmentIdx = 0;
		    	script.instruct_txt.text = allStep;

				// populate list
				script.scroll_Script.cmd_createList(routeSegment.length, instructionStep, distanceStep,segmentIdx);
				script.scrollView_Script.recomputeBoundaries();
				//script.scrollBar_Script.reset();

				drawMapPin();

		    	//script.voice_txt.enabled = false;
				script.map_txt.text = script.dest_txt.text;

				global.pathReady = true;
				script.start_button.getChild(0).getComponent("Component.RenderMeshVisual").mainMaterial = script.rainbow_mat;
			  	script.start_button.getComponent("Physics.ColliderComponent").enabled = true;

				//print("length " + routeSegment.length);
				// This will FAIL in lens studio, code below this will not get executed
				var destUrl = script.route_URL + 
							'?a=' + script.API_key +
					        '&b=' + global.lat.toFixed(5) +
					        '&c=' + global.lng.toFixed(5) +
					        '&d=' + routeSegment[0].startLat.toFixed(5) +
					        '&e=' + routeSegment[0].startLng.toFixed(5) +
					        '&f=' + routeSegment[routeSegment.length-1].endLat.toFixed(5) +
					        '&g=' + routeSegment[routeSegment.length-1].endLng.toFixed(5) +
							'&h=18';
				print(destUrl);
				script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
				print(script.webmap_obj.getComponent('Component.ScriptComponent').url);
		    }
		}else{
			print("post error");
		}
    });
}


//////////////////////////////////
//--- Users command
//////////////////////////////////


// called when user said "Find a ...."
script.cmd_find = function (){
    print("find: " + global.voiceCmd);

    // extract: gps, name, url, #6 from google map
    let httpRequest = RemoteServiceHttpRequest.create();
    httpRequest.url = 'https://places.googleapis.com/v1/places:searchNearby'; 
    httpRequest.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;
    httpRequest.setHeader('X-Goog-Api-Key', script.API_key);
	httpRequest.setHeader('Content-Type', 'application/json');
	httpRequest.setHeader('X-Goog-FieldMask', 'places.displayName,places.location');
	const requestBody = {
	  "includedTypes": ["restaurant"],
	  "maxResultCount": 5,
	  "locationRestriction": {
	    "circle": {
	      "center": {
	        "latitude": 0,
	        "longitude": 0},
	      "radius": 500.0
	    }
	  },
      "rankPreference": "DISTANCE"
	}; 
    
    // includedTypes: https://developers.google.com/maps/documentation/places/web-service/place-types
    let contain_restaurant = global.voiceCmd.toLowerCase().includes("restaurant");
    let contain_coffee = global.voiceCmd.toLowerCase().includes("coffee");
    let contain_hotel = global.voiceCmd.toLowerCase().includes("hotel");

    if(contain_restaurant){
        requestBody.includedTypes = "restaurant";
    }else if(contain_coffee){
        requestBody.includedTypes = "coffee_shop";
    }else if(contain_hotel){
        requestBody.includedTypes = "hotel";
    }

    requestBody.locationRestriction.circle.center.latitude = global.lat;
    requestBody.locationRestriction.circle.center.longitude = global.lng;
	httpRequest.body = JSON.stringify(requestBody);

    // Perform the HTTP request
    remoteServiceModule.performHttpRequest(httpRequest, (response) => {
          if (response.statusCode === 200) {
		        // Check if the response status is 200 (OK)
		        const obj = JSON.parse(response.body);
		        print(response.body);
		        if(obj.places){

			    	var numPlace = Math.min(obj.places.length, 5);

					for(let i = 0; i < 5;i++){
						placesLat[i] = 200;
						placesLon[i] = 200;
					}

			        for(let i = 0; i < numPlace;i++){
						placesLat[i] = obj.places[i].location.latitude;
						placesLon[i] = obj.places[i].location.longitude;
						placesName[i] = obj.places[i].displayName.text;
						placesDist[i] = distLatLng(global.lat,global.lng,placesLat[i],placesLon[i]);
					 	print(i + " " + placesName[i] + "\n" + placesDist[i]);
			        }

			        global.pathReady = false;
			        script.start_button.getChild(0).getComponent("Component.RenderMeshVisual").mainMaterial = script.unlit_mat;
			  		script.start_button.getComponent("Physics.ColliderComponent").enabled = false;
			        //script.voice_txt.enabled = false;
			        script.map_txt.text = "Near by " + requestBody.includedTypes;
					script.instruct_txt.text = "";
					
					// populate list
					script.scroll_Script.cmd_destroyList();
					script.scroll_Script.cmd_placeList(numPlace, placesName, placesDist);
					script.scrollView_Script.recomputeBoundaries();

					// zoom: 21-0m, 20-30m, 19-70m, 18-150m, 17-310m500m
					// for(let k = 0; k < 500;k+=10){
					// 	var result = 21 - (Math.floor(Math.log2(Math.ceil(k/20))));
					// 	print(k + ": " + result);
					// }
					var zoomLevel = 21 - (Math.floor(Math.log2(Math.ceil(placesDist[numPlace-1]/20))));
					var destUrl = script.nearby_URL + 
							'?a=' + script.API_key +
					        '&b=' + global.lat.toFixed(5) +
					        '&c=' + global.lng.toFixed(5) +
					        '&d=' + placesLat[0].toFixed(5) +
					        '&e=' + placesLon[0].toFixed(5) +
					        '&f=' + placesLat[1].toFixed(5) +
					        '&g=' + placesLon[1].toFixed(5) +
							'&h=' + placesLat[2].toFixed(5) +
					        '&i=' + placesLon[2].toFixed(5) +
					        '&j=' + placesLat[3].toFixed(5) +
					        '&k=' + placesLon[3].toFixed(5) +
							'&l=' + placesLat[4].toFixed(5) +
					        '&m=' + placesLon[4].toFixed(5) +
							'&n=' + zoomLevel;
					print(destUrl);
					script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
					print(script.webmap_obj.getComponent('Component.ScriptComponent').url);
		        }       
          }
    });
}

// called when user select a nearby place
script.cmd_choosePlace = function (idx){
	print("choose place " + idx);
	script.dest_txt.text = placesName[idx];
    var	url = 'https://maps.googleapis.com/maps/api/directions/json' + 
					        '?key=' + script.API_key +
					        '&destination=' + placesLat[idx] + ',' + placesLon[idx] +
					        '&origin=' + global.lat + ',' + global.lng +
					        '&mode=walking';
    navigationRequest(url);
}

// called when user said "Take me to ..."
script.cmd_goto = function (){
	let idxTo = global.voiceCmd.toLowerCase().indexOf("to");	// start of to
	let cmdWord = global.voiceCmd.toLowerCase().substring(idxTo+2,global.voiceCmd.length-1);
	let combine = cmdWord.concat(", ", cityName);
	// the.url in Spectacle cannot contain space -> replace space with %20
	var dest = combine.replace(/ /g,"%20");

	script.dest_txt.text = cmdWord;
	print("goto: " + cmdWord);

	var url = 'https://maps.googleapis.com/maps/api/directions/json' + 
						'?key=' + script.API_key +
						'&destination=' + dest +
						'&origin=' + global.lat + ',' + global.lng +
						'&mode=walking';
    navigationRequest(url);
}

// called when user said "Open keyboard"
script.cmd_keyboard = function (data){
	script.dest_txt.text = data;
	let combine = data.concat(", ", cityName);
	// the.url in Spectacle cannot contain space -> replace space with %20
	var dest = combine.replace(/ /g,"%20");

	print("goto: " + data);
	// (current gps, to dest + city) -> google dir
	var url = 'https://maps.googleapis.com/maps/api/directions/json' + 
				        '?key=' + script.API_key +
				        '&destination=' + dest +
				        '&origin=' + global.lat + ',' + global.lng +
				        '&mode=walking';
    navigationRequest(url);
}


// restart the navigation, called when user press restart button on the hand
script.cmd_restart = function (){

    if(global.pathReady){
		script.start_button.enabled = true;
		script.dirUI_obj.enabled = true;
		
		// FAIL in lens studio
		script.voice_Script.enableMic();
		script.scroll_Script.cmd_destroyList();
		segmentIdx = 0;
		routeSegment.length = 0;
		reachDestination = true;
		script.arrow_UI.enabled = false;
		script.navigating = false;
		script.sign_UI.enabled = false;
		script.turn_obj.enabled = false;
		script.goal_obj.enabled = false;
		script.rotLeft_obj.enabled = false;
		script.rotRight_obj.enabled = false;
		script.voice_txt.enabled = true;
		script.hand_obj.enabled = false;
		global.pathReady = false;
		script.start_button.getChild(0).getComponent("Component.RenderMeshVisual").mainMaterial = script.unlit_mat;
		script.start_button.getComponent("Physics.ColliderComponent").enabled = false;
		script.instruct_txt.text = "Where do you want to go?";
		script.map_txt.text = "Map";
		print("ready to restart");

		var destUrl = script.route_URL + 
				'?a=' + script.API_key +
		        '&b=' + global.lat.toFixed(5) +
		        '&c=' + global.lng.toFixed(5) +
		        '&d=' + global.lat.toFixed(5) +
		        '&e=' + global.lng.toFixed(5) +
		        '&f=' + global.lat.toFixed(5) +
		        '&g=' + global.lng.toFixed(5) +
				'&h=18';
		script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
	}
}

// toggle map button on the hand menu
script.cmd_toggleMap = function (){
	if(script.arrow_UI.enabled){
		script.start_button.enabled = false;
		script.dirUI_obj.enabled = !script.dirUI_obj.enabled;	
		print("toggle map");
		var destUrl = script.route_URL + 
				'?a=' + script.API_key +
		        '&b=' + global.lat.toFixed(5) +
		        '&c=' + global.lng.toFixed(5) +
		        '&d=' + routeSegment[0].startLat.toFixed(5) +
		        '&e=' + routeSegment[0].startLng.toFixed(5) +
		        '&f=' + routeSegment[routeSegment.length-1].endLat.toFixed(5) +
		        '&g=' + routeSegment[routeSegment.length-1].endLng.toFixed(5) +
				'&h=18';
		script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
	}
}

// called when user click the button to recenter the map
script.cmd_refreshMap = function (){
	if(global.pathReady){
		var destUrl = script.route_URL + 
				'?a=' + script.API_key +
		        '&b=' + global.lat.toFixed(5) +
		        '&c=' + global.lng.toFixed(5) +
		        '&d=' + routeSegment[0].startLat.toFixed(5) +
		        '&e=' + routeSegment[0].startLng.toFixed(5) +
		        '&f=' + routeSegment[routeSegment.length-1].endLat.toFixed(5) +
		        '&g=' + routeSegment[routeSegment.length-1].endLng.toFixed(5) +
				'&h=18';
		script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
	}else{
		var destUrl = script.route_URL + 
				'?a=' + script.API_key +
		        '&b=' + global.lat.toFixed(5) +
		        '&c=' + global.lng.toFixed(5) +
		        '&d=' + global.lat.toFixed(5) +
		        '&e=' + global.lng.toFixed(5) +
		        '&f=' + global.lat.toFixed(5) +
		        '&g=' + global.lng.toFixed(5) +
				'&h=18';
		script.webmap_obj.getComponent(WebView.getTypeName()).goToUrl(destUrl);
	}
}


//////////////////////////////////
//--- Interop with Typescript 
//////////////////////////////////

function passToJS_updateText(data){
	script.voice_txt.text = data;
}

function passToJS_confirmText(data){
	script.cmd_keyboard(data);
}

// Attach to global object if needed
global.passToJS_updateText = passToJS_updateText;
global.passToJS_confirmText = passToJS_confirmText;







