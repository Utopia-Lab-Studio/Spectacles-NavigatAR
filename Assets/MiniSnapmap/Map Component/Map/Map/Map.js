// Map.js
// Version: 1.0.0
// Event: 
// Description: Map component for displaying map in Lens.
// Copyright (c) 2023 Snap Inc.

// @input Asset.ObjectPrefab componentPrefab

// @ui {"widget":"label"}
// @ui {"widget":"label", "label":"Sets texture for controlling the look of the map"}
// @input Asset.Texture maskTexture
// @input bool useOutlineTexture
// @input Asset.Texture mapOutlineTexture {"showIf":"useOutlineTexture"}
// @ui {"widget":"separator"}

// @ui {"widget":"label", "label":"Zoom level: 8 far zoom , 21 close zoom"}
// @input float mapZoomLevel {"widget": "slider", "min": 8.0, "max": 21.0, "step": 1.0}
// @ui {"widget":"label"}

// @ui {"widget":"separator"}
// @ui {"widget":"label", "label":"If user pin should be shown in the map"}
// @input bool showUserPin
// @input Asset.ObjectPrefab userPinVisual {"showIf":"showUserPin"}
// @input vec2 userPinScale {"label":"User Pin Scale", "showIf":"showUserPin"} 
// @input bool userPinRotated {"showIf":"showUserPin"}
// @ui {"widget":"separator"} 

// @ui {"widget":"label", "label":"Map Pins"}
// @ui {"widget":"label", "label":"Make sure your Pin Prefab has ScreenTransform"}
// @input Asset.ObjectPrefab mapPinPrefab {"showIf":"showUserPin"}
// @input bool mapPinsRotated
// @ui {"widget":"separator"}

// @ui {"widget":"label", "label":"Interactions"}
// @input bool enableScrolling 
// @ui {"widget":"separator"}

// @ui {"widget":"label", "label":"For setting map location to custom location (not following user location)"}
// @input bool setMapToCustomLocation 
// @input string longitude {"showIf":"setMapToCustomLocation"}
// @input string latitude {"showIf":"setMapToCustomLocation"}
// @input float rotation {"showIf":"setMapToCustomLocation"}

// @ui {"widget":"separator"}
// @ui {"widget":"label", "label":"Rotations"}
// @input bool mapRotated
// @input bool mapRotationSmoothing

// @ui {"widget":"label"}
// @ui {"widget":"label", "label":"How often map should be updated (seconds)"}
// @input float mapUpdateThreshold


var mapControllerScript;

script.initialized = false;

script.createEvent("OnStartEvent").bind(function() {
    var mapComponentInstance = script.componentPrefab.instantiate(script.getSceneObject());
    
    mapControllerScript = findScriptComponent(mapComponentInstance, function(scriptComponent) {
        return scriptComponent.isMapComponent;
    });

    var mapLocation = null;   
    if (script.setMapToCustomLocation) {
        mapLocation = {longitude: parseFloat(script.longitude), latitude: parseFloat(script.latitude), heading: script.rotation}; 
    }
 
    var mapFocusPosition = new vec2(0.5, 0.5);  
    
    var mapParameters={
        mapUpdateThreshold: script.mapUpdateThreshold,
        setMapToCustomLocation: script.setMapToCustomLocation,
        mapLocation: mapLocation,
        mapFocusPosition: mapFocusPosition,
        userPinVisual: script.userPinVisual,
        showUserPin:script.showUserPin,
        mapZoomLevel: calculateZoomLevel(),
        maskTexture: script.maskTexture,
        mapOutlineTexture: script.mapOutlineTexture,
        useOutlineTexture: script.useOutlineTexture,
        enableScrolling: script.enableScrolling,
        userPinScale: script.userPinScale,
        mapPinsRotated: script.mapPinsRotated,        
        mapRotated: script.mapRotated,
        userPinRotated: script.userPinRotated,
        enableMapSmoothing: script.mapRotationSmoothing,
        mapPinPrefab: script.mapPinPrefab
    };
    
    mapControllerScript.initialize(mapParameters);
    
    script.initialized = true;
});

// Exposed functions
// =====

/**
 * Called when all the initial map tiles are loaded
 */
script.onMaptilesLoaded = function(fn) {
    mapControllerScript.onMaptilesLoaded = fn;
};

/**
 * Called when the initial location of the map is set
 */
script.onInitialLocationSet = function (fn) {
    mapControllerScript.onInitialLocationSet = fn;
};

/**
 * Setting function to call when new tile comes into the view
 */
script.onTileCameIntoView = function (fn) {
    mapControllerScript.onTileCameIntoView = fn;
};

/**
 * Setting function to call when tile goes out of the view
 */
script.onTileWentOutOfView = function (fn) {
    mapControllerScript.onTileWentOutOfView = fn;
};

/**
 * Getting initial map location (middle tile)
 */
script.getInitialMapTileLocation = function () {
    return mapControllerScript.getInitialMapTileLocation();
};

/**
 * Setting is user pin should be rotated with map rotation or not
 */
script.setUserPinRotated = function(value) {
    mapControllerScript.setUserPinRotated(value);
};


/**
 * For enabling/disabling scrolling of the map from script
 */
script.setMapScrolling = function(value) {
    mapControllerScript.setMapScrolling(value); 
};

/**
 * For creating a new map pin
 */
script.createMapPin = function(longitude, latitude) {
    var location = {longitude: longitude, latitude: latitude};
    return mapControllerScript.createMapPin(location); 
};

/**
 * For removing a map pin from the map
 */
script.removeMapPin = function(mapPin) {
    mapControllerScript.removeMapPin(mapPin); 
};

/**
 * For removing all map pins from map
 */
script.removeMapPins = function() {
    mapControllerScript.removeMapPins(); 
};

/**
 * Centering map to intial location
 */
script.centerMap = function() {
    if (mapControllerScript != undefined) {
        mapControllerScript.centerMap();
    }
};

/**
 * Drawing geometry point to map
 */
script.drawGeometryPoint = function (geometry, radius) {
    mapControllerScript.drawGeometryPoint(geometry,radius);
};

/**
 * Drawing geometry line to map
 */
script.drawGeometryLine = function (geometry, thickness) {
    mapControllerScript.drawGeometryLine(geometry, thickness);
};

/**
 * Drawing geometry multiline to map
 */
script.drawGeometryMultiline = function (geometry, thickness) {
    mapControllerScript.drawGeometryMultiline(geometry);
};

/**
 * Clearing all drawn geometry
 */
script.clearGeometry = function () {
    mapControllerScript.clearGeometry();
};

// Helper functions
// =====

/**
 * Changes the zoom level input to scale map component receives it
 * https://wiki.openstreetmap.org/wiki/Zoom_levels 
 */
function calculateZoomLevel() {
    var mappedValue = map(script.mapZoomLevel, 8, 21, -11, 2);
    return mappedValue;
}

// |SceneObject| Find a script component with a predicate function.
function findScriptComponent(sceneObject, predicate) {
    var components = sceneObject.getComponents("ScriptComponent");
    for (var idx = 0; idx < components.length; idx++) {
        if (predicate(components[idx])) {
            return components[idx];
        } 
    }
    return null;
}

// |Math| Maps a number to a different interval. 
function map(input, inputMin, inputMax, outputMin, outputMax) {
    input = (input - inputMin) / (inputMax - inputMin);
    var output = input * (outputMax - outputMin) + outputMin;
    return output;
}