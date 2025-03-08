// MapController.js
// Version: 1.0.0
// Event: initialize()
// Description: Creates map tiles and controls the markers, movement of the map
// Copyright (c) 2023 Snap Inc.

// @input Asset.MapModule mapModule
// @input Component.ScriptComponent locationService
// @input Asset.Material mapTileMaterial
// @input Asset.Material lineMaterial

// @input Asset.ObjectPrefab mapRenderPrefab
// @input Component.Material maskMaterial

script.isMapComponent = true;

// Grid
var mapGridObject;
var mapCenter;
var GridViewModule = require("MapGridView");
var pinOffsetter;
var gridView;
var config;
var initialPositionLocationAsset;
var mapFocusPosition;
var offsetForLocation;
var mapRenderOrder = 1;
var mapCellCount = 0;
var loadedCells = 0;
var initialMapTileLocation;

// Map
var usingCustomLocation = false;
var mapLocation;
var shouldFollowMapLocation = false;
var userScreenTransform;
var zoomLevel = 0;
var mapPinPool = [];
var viewScrolled = false;
var lastMapUpdate = 0;
var mapUpdateThreshold;
var mapPinPrefab;

//Map Render
var mapRenderObject;
var renderCamera;
var mapScreenTransform;

// Rotation logic
var mapPinsRotated = false;
var mapRotated = false;
var userPinRotated = false;
var mapSmoothingApplied = true;
var DEG_TO_RAD = Math.PI / 180;

// Interactions
var scrollingEnabled = false;

// Rotations
var currentUserRotation = quat.fromEulerAngles(0, 0, 0);
var targetUserRotation = quat.fromEulerAngles(0, 0, 0);
var currentMapRotation = quat.fromEulerAngles(0, 0, 0);
var targetMapRotation = quat.fromEulerAngles(0, 0, 0);
var currentPinRotation = quat.fromEulerAngles(0, 0, 0);
var targetPinRotation = quat.fromEulerAngles(0, 0, 0);

// Functions accessed from outside
script.onMaptilesLoaded = function () { };
script.onInitialLocationSet = function (location) { };
script.onTileWentOutOfView = function (
  lastHorizontalIndex,
  lastVerticalIndex
) { };
script.onTileCameIntoView = function (
  lastHorizontalIndex,
  lastVerticalIndex
) { };

// Line drawing
var lineMaterial = script.lineMaterial;
var geometryObjects = [];

/**
 * Called from Map custom component script to initialize the script
 */
script.initialize = function (mapParameters) {
  mapUpdateThreshold = mapParameters.mapUpdateThreshold;
  usingCustomLocation = mapParameters.setMapToCustomLocation;
  mapFocusPosition = mapParameters.mapFocusPosition;
  zoomLevel = mapParameters.mapZoomLevel;
  scrollingEnabled = mapParameters.enableScrolling;
  mapPinsRotated = mapParameters.mapPinsRotated;
  userPinRotated = mapParameters.userPinRotated;
  mapSmoothingApplied = mapParameters.enableMapSmoothing;
  showingUserPin = mapParameters.showUserPin;
  mapRotated = mapParameters.mapRotated;
  mapPinPrefab = mapParameters.mapPinPrefab;

  // Setup the render camera references
  mapScreenTransform = script
    .getSceneObject()
    .getParent()
    .getComponent("Component.ScreenTransform");

  var sceneRoot = getSceneRoot(script.getSceneObject());
  mapRenderObject = script.mapRenderPrefab.instantiate(sceneRoot);
  renderCamera = mapRenderObject.getComponent("Component.Camera");

  // Create a render layer for the cell content
  var contentRenderLayer = LayerSet.makeUnique();
  renderCamera.renderLayer = contentRenderLayer;

  mapGridObject = mapRenderObject.getChild(0).getChild(0);
  mapGridObject.layer = contentRenderLayer;
  mapCenter = mapRenderObject.getChild(0).getChild(0).getChild(0);
  mapCenter.layer = contentRenderLayer;

  setDimensions();

  if (usingCustomLocation) {
    mapLocation = mapParameters.mapLocation;
  } else {
    mapLocation = script.locationService.getUserLocation();
  }

  var userlocation = script.locationService.getUserLocation();

  createMapGrid();
  script.centerMap();

  if (mapParameters.showUserPin) {
    script.spawnUserPin(
      mapParameters.userPinVisual,
      userlocation,
      mapParameters.userPinScale
    );
  }

  setMapMask(
    mapParameters.maskTexture,
    mapParameters.mapOutlineTexture,
    mapParameters.useOutlineTexture
  );
};

script.createEvent("UpdateEvent").bind(function () {
  //Applying map smoothing if enabled
  if (mapSmoothingApplied) {
    if (userScreenTransform && userPinRotated && !viewScrolled) {
      currentUserRotation = interpolate(
        currentUserRotation,
        targetUserRotation,
        4
      );
      userScreenTransform.rotation = currentUserRotation;
    }

    if (!viewScrolled && mapRotated) {
      currentMapRotation = interpolate(
        currentMapRotation,
        targetMapRotation,
        4
      );
      config.screenTransform.rotation = currentMapRotation;
    }

    //rotate all the map pins according to map rotation if enabled
    if (mapPinsRotated && !viewScrolled) {
      currentPinRotation = interpolate(
        currentPinRotation,
        targetPinRotation,
        4
      );
      for (var i = 0; i < mapPinPool.length; i++) {
        if (mapPinPool[i] != undefined) {
          var sceneTransform = mapPinPool[i].getComponent(
            "Component.ScreenTransform"
          );
          sceneTransform.rotation = currentPinRotation;
        }
      }
    }
  }

  //User / Map location update
  if (getTime() - lastMapUpdate > mapUpdateThreshold) {
    if (!usingCustomLocation) {
      setNewMapLocation(script.locationService.getUserLocation());
    }

    if (showingUserPin) {
      setNewUserPosition(script.locationService.getUserLocation());
    }

    lastMapUpdate = getTime();
  }
});

//  Exposed functions
// =====

/**
 * For creating a new map pin for the map
 */
script.createMapPin = function (location) {
  var longitude = location.longitude;
  var latitude = location.latitude;

  var mapPin = mapPinPrefab.instantiate(mapGridObject);
  mapPin.name = "MapPin_" + longitude.toString() + latitude.toString();

  var screenTransform = mapPin.getComponent("Component.ScreenTransform");

  if (screenTransform === null) {
    print("ScreenTransform missing from MapPin prefab!");
    print("MapPin not added");
    mapPin.destroy();
    return null;
  } else {
    // Bind a location pin
    pinOffsetter.bindScreenTransformToLocation(
      screenTransform,
      longitude,
      latitude
    );

    //Sets right render layers to all the objects in the map pin hierarchy
    forEachSceneObjectInSubHierarchy(mapPin, function (sceneObject) {
      sceneObject.layer = mapCenter.layer;
      sceneObject.getComponents("Image").forEach(function (imageComponent) {
        imageComponent.setRenderOrder(mapRenderOrder + 3);
      });
    });

    pinOffsetter.layoutScreenTransforms(gridView);
    mapPinPool.push(mapPin);

    return mapPin;
  }
};

/**
 * Removing map pin
 */
script.removeMapPin = function (mapPin) {
  var pinObjectName = mapPin.name;
  for (var i = 0; i < mapPinPool.length; i++) {
    if (mapPinPool[i].name == pinObjectName) {
      mapPinPool.splice(i, 1);
      break;
    }
  }

  var pinScreenTransform = mapPin.getComponent("ScreenTransform");
  pinOffsetter.unbindScreenTransform(pinScreenTransform);
  mapPin.destroy();
};

/**
 * Removes all the map pins from the map
 */
script.removeMapPins = function () {
  for (var i = 0; i < mapPinPool.length; i++) {
    var pinScreenTransform = mapPinPool[i].getComponent("ScreenTransform");
    pinOffsetter.unbindScreenTransform(pinScreenTransform);
    mapPinPool[i].destroy();
    mapPinPool[i] = undefined;
  }
  mapPinPool = [];
};

/**
 * Spawning a user pin
 */
script.spawnUserPin = function (mapPinPrefab, location, mapPinScale) {
  var mapPin = mapPinPrefab.instantiate(mapGridObject);
  userScreenTransform = mapPin.getComponent("ScreenTransform");
  userScreenTransform.scale = new vec3(mapPinScale.x, mapPinScale.y, 1.0);

  mapPin.layer = mapCenter.layer;
  mapPin.getComponents("Image").forEach(function (imageComponent) {
    imageComponent.setRenderOrder(mapRenderOrder + 4);
  });

  for (var i = 0; i < mapPin.getChildrenCount(); i++) {
    var child = mapPin.getChild(i);
    child.layer = mapCenter.layer;
    child.getComponents("Image").forEach(function (imageComponent) {
      imageComponent.setRenderOrder(mapRenderOrder + 4 + i);
    });
  }

  // Bind a location pin
  pinOffsetter.bindScreenTransformToLocation(
    userScreenTransform,
    location.longitude,
    location.latitude
  );

  pinOffsetter.layoutScreenTransforms(gridView);
};

/**
 * For enabling/disabling scrolling of the map
 */
script.setMapScrolling = function (value) {
  config.horizontalScrollingEnabled = value;
  config.verticalScrollingEnabled = value;
};

/**
 * Setting if user pin should be rotated
 */
script.setUserPinRotated = function (value) {
  userPinRotated = value;
};

/**
 * On the recenter call, scroll back to centre of the map
 */
script.centerMap = function () {
  var tween;
  if (tween) {
    tween.cancel();
  }

  var currentOffset = gridView.getOffset();
  var userOffset = getOffsetForLocation(
    config,
    initialPositionLocationAsset,
    mapLocation.longitude,
    mapLocation.latitude
  );
  var targetOffset = userOffset.add(new vec2(0.5, 0.5));
  makeTween(function (t) {
    // Stop the scroll view from scrolling
    gridView.resetVelocity();

    // Move it towards it's target position
    gridView.setOffset(vec2.lerp(currentOffset, targetOffset, t));
    if (t === 1) {
      shouldFollowMapLocation = true;
      viewScrolled = false;
    }
  }, 0.5);
};

/**
 * Getting initial map location (middle tile)
 */
script.getInitialMapTileLocation = function () {
  return initialMapTileLocation;
};

//  Map Grid related
// =====

/**
 * Creates map grid and sets up the config
 */
function createMapGrid() {
  gridView = GridViewModule.makeGridView(script);
  config = GridViewModule.makeConfig();

  //ScreenTransform of where map component is set to
  config.mapScreenTransform = mapScreenTransform;

  var screenTransform = mapGridObject.getComponent("ScreenTransform");
  // Set a container screen transform
  config.screenTransform = screenTransform;

  // Set the horizontal properties
  config.horizontalScrollingEnabled = scrollingEnabled;
  config.horizontalMinIndex = -Infinity;
  config.horizontalMaxIndex = Infinity;
  config.horizontalAllowOutOfIndexRange = true; // When true, `onDataChanged` will be called even when a cell is out of range and the cell will not be disabled when out of range.
  config.horizontalLengthRelativeToParent =
    getWorldWidthToRelativeToParentWidth(config.screenTransform, 2);

  // Set the vertical properties
  config.verticalScrollingEnabled = scrollingEnabled;
  config.verticalMinIndex = -Infinity;
  config.verticalMaxIndex = Infinity;
  config.verticalAllowOutOfIndexRange = false; // When true, `onDataChanged` will be called even when a cell is out of range and the cell will not be disabled when out of range.
  config.verticalLengthRelativeToParent =
    getWorldHeightToRelativeToParentHeight(config.screenTransform, 2);

  // Create an initial position location asset this will be starting position of the map
  initialPositionLocationAsset = LocationAsset.getGeoAnchoredPosition(
    mapLocation.longitude,
    mapLocation.latitude
  ).location.adjacentTile(0, 0, zoomLevel);

  initialMapTileLocation = {
    longitude: mapLocation.longitude,
    latitude: mapLocation.latitude,
  };
  script.onInitialLocationSet(initialMapTileLocation);

  // Calculate how much the map needs to be scrolled to match the geo position of the tile
  offsetForLocation = getOffsetForLocation(
    config,
    initialPositionLocationAsset,
    mapLocation.longitude,
    mapLocation.latitude
  );

  // Offset the map so that it include the map focus position and the offset for the initial location for the provided tile
  gridView.setOffset(offsetForLocation.add(mapFocusPosition));

  // Create a binder that can offset a screen transfor for a given location
  pinOffsetter = makeMapLocationOffsetter(initialPositionLocationAsset);

  config.onLayout = function () {
    onLayout();
  };
  config.onContainerScreenTransformDimensionsChanged = function () {
    onContainerScreenTransformDimensionsChanged();
  };
  config.onScrollingStarted = function () {
    onScrollingStarted();
  };
  config.onShouldConfigureCell = function (cell) {
    onShouldConfigureCell(cell);
  };
  config.onContentMaskRenderLayer = function (renderLayer) {
    onContentMaskRenderLayer(renderLayer);
  };

  config.onCellCountChanged = function (cellCount) {
    mapCellCount = cellCount;
  };

  shouldFollowMapLocation = true;

  var gridRotation = mapLocation.heading * DEG_TO_RAD;
  config.screenTransform.rotation = quat.fromEulerAngles(0, 0, gridRotation);

  // Apply the config (will build the grid view if not already, then will apply the settings)
  gridView.updateConfig(config);
}

/**
 * Provide the cells to be configures / built. Cells are reused as data is scrolled.
 */
function onShouldConfigureCell(cell) {
  var imageComponent = addImageComponentWithMaterial(
    cell.screenTransform, // screen transform given by the grid view
    script.mapTileMaterial.clone(),
    cell.renderLayer
  );

  // Creating Map Texture Provider
  var MapTextureProvider = script.mapModule.createMapTextureProvider();
  var mapTexture = MapTextureProvider;
  imageComponent.mainPass.baseTex = mapTexture;

  cell.onScreenPositionChanged = function () {
    // Fired when scrolled or the bounds change size
    // Update any materials used for masking
  };

  var lastHorizontalIndex;
  var lastVerticalIndex;
  cell.onDataChanged = function () {
    //Checking if new map tiles came into the view / left the view
    if (
      typeof lastHorizontalIndex !== "undefined" &&
      typeof lastVerticalIndex !== "undefined"
    ) {
      if (
        cell.horizontalIndex != lastHorizontalIndex ||
        cell.verticalIndex != lastVerticalIndex
      ) {
        script.onTileWentOutOfView(lastHorizontalIndex, lastVerticalIndex);
        script.onTileCameIntoView(cell.horizontalIndex, cell.verticalIndex);
        lastHorizontalIndex = cell.horizontalIndex;
        lastVerticalIndex = cell.verticalIndex;
      }
    } else {
      script.onTileCameIntoView(cell.horizontalIndex, cell.verticalIndex);
      lastHorizontalIndex = cell.horizontalIndex;
      lastVerticalIndex = cell.verticalIndex;
    }

    // Fired when the index (or other properties change))
    mapTexture.control.location = initialPositionLocationAsset.adjacentTile(
      cell.horizontalIndex,
      cell.verticalIndex,
      0.0
    );
  };

  cell.onDisabled = function () {
    // Fired when a cell is out of range
  };

  cell.onEnabled = function () {
    // Fired when a cell is in range
  };

  cell.onTapped = function () { };

  cell.onShouldDestroy = function () {
    // Fired when a cell is no longer needed (i.e. the bounds became smaller)
    cell.screenTransform.getSceneObject().destroy();
  };

  //A function that gets called when location data fails to download.
  mapTexture.control.onFailed.add(function () {
    print("Location data failed to download");
  });

  //A function that gets called when location data is downloaded.
  mapTexture.control.onReady.add(function () {
    mapTileloaded();
  });
}

//Called when individual map tile is loaded
function mapTileloaded() {
  loadedCells++;

  if (loadedCells == mapCellCount) {
    script.onMaptilesLoaded();
  }
}

function makeMapLocationOffsetter(initialLocationAsset) {
  var locationBoundScreenTransforms = {};
  return {
    bindScreenTransformToLocation(screenTransform, longitude, latitude) {
      locationBoundScreenTransforms[screenTransform.uniqueIdentifier] = {
        screenTransform: screenTransform,
        longitude: longitude,
        latitude: latitude,
      };
    },
    unbindScreenTransform: function (screenTransform) {
      delete locationBoundScreenTransforms[screenTransform.uniqueIdentifier];
    },
    layoutScreenTransforms: function (gridView) {
      Object.keys(locationBoundScreenTransforms).forEach(function (
        locationKey
      ) {
        var offset = gridView.getOffset();
        var config = gridView.getConfig();
        var boundLocation = locationBoundScreenTransforms[locationKey];

        var initialTileOffset = script.mapModule.longLatToImageRatio(
          boundLocation.longitude,
          boundLocation.latitude,
          initialLocationAsset
        );

        setScreenTransformRect01(
          boundLocation.screenTransform,
          offset.x +
          initialTileOffset.x * config.horizontalLengthRelativeToParent,
          offset.y +
          initialTileOffset.y * config.verticalLengthRelativeToParent,
          0,
          0
        );
      });
    },
  };
}

/**
 *  Fired when the bound change size.
 */
function onContainerScreenTransformDimensionsChanged() {
  //Cell sizes will need to be change to account for the desired aspect ratio
  config.horizontalLengthRelativeToParent =
    getWorldWidthToRelativeToParentWidth(config.screenTransform, 5);
  config.verticalLengthRelativeToParent =
    getWorldHeightToRelativeToParentHeight(config.screenTransform, 5);

  // Re-calculate how much the map needs to be scrolled to match the geo position of the tile
  offsetForLocation = getOffsetForLocation(
    config,
    initialPositionLocationAsset,
    mapLocation.longitude,
    mapLocation.latitude
  );

  // Again, offset the map so that it include the map focus position
  // and the offset for the initial location for the provided tile
  gridView.setOffset(offsetForLocation.add(mapFocusPosition));

  gridView.updateConfig(config); // Update the config (will re-layout cells and notify cells data chages)

  setDimensions();
}

//  Map functionality
// =====

/**
 * Setting new position for user pin
 */
function setNewUserPosition(location) {
  pinOffsetter.bindScreenTransformToLocation(
    userScreenTransform,
    location.longitude,
    location.latitude
  );
  pinOffsetter.layoutScreenTransforms(gridView);

  //setting user pin rotation
  var userRotation = -1 * location.heading * DEG_TO_RAD;
  if (userScreenTransform && userPinRotated && !viewScrolled) {
    if (!mapSmoothingApplied) {
      userScreenTransform.rotation = quat.fromEulerAngles(0, 0, userRotation);
    } else {
      targetUserRotation = quat.fromEulerAngles(0, 0, userRotation);
    }
  }
}

/**
 * Setting a new location for the map
 */
function setNewMapLocation(location) {
  mapLocation = location;
  pinOffsetter.bindScreenTransformToLocation(
    mapCenter.getComponent("ScreenTransform"),
    location.longitude,
    location.latitude
  );

  pinOffsetter.layoutScreenTransforms(gridView);

  if (shouldFollowMapLocation) {
    offsetForLocation = getOffsetForLocation(
      config,
      initialPositionLocationAsset,
      location.longitude,
      location.latitude
    );
    gridView.setOffset(offsetForLocation.add(mapFocusPosition));
  }

  // if view is scrolled from centre don't apply rotation
  if (!viewScrolled && mapRotated) {
    var rotation = mapLocation.heading * DEG_TO_RAD;

    if (mapSmoothingApplied) {
      targetMapRotation = quat.fromEulerAngles(0, 0, rotation);
    } else {
      config.screenTransform.rotation = quat.fromEulerAngles(0, 0, rotation);
    }
  }

  //rotate all the map pins according to map rotation
  var mapPinRotation = -1 * location.heading * DEG_TO_RAD;
  if (mapPinsRotated && !viewScrolled) {
    if (!mapSmoothingApplied) {
      for (var i = 0; i < mapPinPool.length; i++) {
        if (mapPinPool[i] != undefined) {
          var sceneTransform = mapPinPool[i].getComponent(
            "Component.ScreenTransform"
          );
          sceneTransform.rotation = quat.fromEulerAngles(0, 0, mapPinRotation);
        }
      }
    } else {
      targetPinRotation = quat.fromEulerAngles(0, 0, mapPinRotation);
    }
  }
}

/**
 * Sets mask texture to the map
 */
function setMapMask(maskTexture, mapOutlineTexture, useOutlineTexture) {
  script.maskMaterial.mainPass.mapMask = maskTexture;
  script.maskMaterial.mainPass.useOutlineTexture = useOutlineTexture;
  if (mapOutlineTexture != undefined) {
    script.maskMaterial.mainPass.mapOutline = mapOutlineTexture;
  }
}

//  Drawing geometry to map
// =====

/**
 * Drawing geometry point to map
 */
script.drawGeometryPoint = function (geometryPoint, radius) {
  if (typeof radius !== "number") {
    radius = 0.1;
  }

  var position = getWorldPositionForGeometryPoint(geometryPoint);

  var sceneObject = global.scene.createSceneObject("");
  sceneObject.setParent(script.getSceneObject());
  var screenTransform = sceneObject.createComponent(
    "Component.ScreenTransform"
  );
  screenTransform.rotation = currentMapRotation.invert();

  var renderMeshSceneObject = global.scene.createSceneObject("");
  renderMeshSceneObject.setParent(sceneObject);
  renderMeshSceneObject.layer = script.getSceneObject().layer;

  addRenderMeshVisual(
    renderMeshSceneObject,
    makeCircle2DMesh(position, radius),
    lineMaterial,
    mapRenderOrder + 1
  );

  pinOffsetter.bindScreenTransformToLocation(
    screenTransform,
    mapLocation.long,
    mapLocation.lat
  );
  geometryObjects.push(sceneObject);
};

/**
 * Drawing geometry line to map
 */
script.drawGeometryLine = function (geometryLine, thickness) {
  if (typeof thickness !== "number") {
    thickness = 0.2;
  }

  var start = getWorldPositionForGeometryPoint(geometryLine[0]);
  var end = getWorldPositionForGeometryPoint(geometryLine[1]);

  var sceneObject = global.scene.createSceneObject("");
  sceneObject.setParent(script.getSceneObject());
  var screenTransform = sceneObject.createComponent(
    "Component.ScreenTransform"
  );
  screenTransform.rotation = currentMapRotation.invert();

  var renderMeshSceneObject = global.scene.createSceneObject("");
  renderMeshSceneObject.setParent(sceneObject);
  renderMeshSceneObject.layer = script.getSceneObject().layer;

  addRenderMeshVisual(
    renderMeshSceneObject,
    makeLineStrip2DMeshWithJoints([start, end], thickness),
    lineMaterial,
    mapRenderOrder + 1
  );

  pinOffsetter.bindScreenTransformToLocation(
    screenTransform,
    mapLocation.long,
    mapLocation.lat
  );

  geometryObjects.push(sceneObject);

};

/**
 * Drawing geometry multiline to map
 */
script.drawGeometryMultiline = function (geometryMultiline, thickness) {
  if (typeof thickness !== "number") {
    thickness = 0.2;
  }

  var sceneObject = global.scene.createSceneObject("");
  sceneObject.setParent(script.getSceneObject());
  var screenTransform = sceneObject.createComponent(
    "Component.ScreenTransform"
  );
  screenTransform.rotation = currentMapRotation.invert();

  var renderMeshSceneObject = global.scene.createSceneObject("");
  renderMeshSceneObject.setParent(sceneObject);
  renderMeshSceneObject.layer = script.getSceneObject().layer;

  var positions = geometryMultiline.map((point) =>
    getWorldPositionForGeometryPoint(point)
  );

  addRenderMeshVisual(
    renderMeshSceneObject,
    makeLineStrip2DMeshWithJoints(positions, thickness),
    lineMaterial,
    mapRenderOrder + 1
  );

  pinOffsetter.bindScreenTransformToLocation(
    screenTransform,
    mapLocation.long,
    mapLocation.lat
  );
  geometryObjects.push(sceneObject);
};

/**
 * Clearing all drawn geometry
 */
script.clearGeometry = function () {
  geometryObjects.forEach((sceneObject) => {
    pinOffsetter.unbindScreenTransform(
      sceneObject.getComponent("Component.ScreenTransform")
    );
    sceneObject.destroy();
  });
};

/**
 * Getting world position for geometry
 */
function getWorldPositionForGeometryPoint(geometryPoint) {
  var offset = gridView.getOffset();
  var config = gridView.getConfig();

  var initialTileOffset = script.mapModule.longLatToImageRatio(
    geometryPoint.x,
    geometryPoint.y,
    initialPositionLocationAsset
  );
  var localPoint = new vec2(
    lerp(
      -1,
      1,
      offset.x + initialTileOffset.x * config.horizontalLengthRelativeToParent
    ),
    lerp(
      1,
      -1,
      offset.y + initialTileOffset.y * config.verticalLengthRelativeToParent
    )
  );

  return config.screenTransform.localPointToWorldPoint(localPoint);
}

/**
 * Adding render mesh visual
 */
function addRenderMeshVisual(sceneObject, mesh, material, renderOrder) {
  var renderMeshVisual = sceneObject.createComponent(
    "Component.RenderMeshVisual"
  );
  renderMeshVisual.addMaterial(material);
  renderMeshVisual.mesh = mesh;
  renderMeshVisual.renderOrder = renderOrder;
  return renderMeshVisual;
}

/**
 * Making circle 2D mesh
 */
function makeCircle2DMesh(position, radius) {
  const builder = new MeshBuilder([{ name: "position", components: 3 }]);

  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;

  const [indices, vertices] = makeCircle2DIndicesVerticesPair(
    position,
    radius,
    16,
    0
  );

  builder.appendIndices(indices);
  builder.appendVerticesInterleaved(vertices);

  builder.updateMesh();

  return builder.getMesh();
}

/**
 * Making circle indices vertices pair
 */
function makeCircle2DIndicesVerticesPair(
  position,
  radius,
  segments,
  indicesOffset
) {
  const indices = [];
  const vertices = [];

  vertices.push(position.x, position.y, position.z);

  // Add the vertices around the circle
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = position.x + Math.cos(angle) * radius;
    const y = position.y + Math.sin(angle) * radius;
    const z = position.z;

    vertices.push(x, y, z);
  }

  // Add the indices for the triangles
  for (let i = 1; i <= segments; i++) {
    indices.push(indicesOffset, i + indicesOffset, i + indicesOffset + 1);
  }

  return [indices, vertices];
}

/**
 * Making line mesh with joints
 */
function makeLineStrip2DMeshWithJoints(positions, thickness) {
  const builder = new MeshBuilder([{ name: "position", components: 3 }]);

  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;

  for (let i = 0; i < positions.length - 1; ++i) {
    const [indices, vertices] = makeLine2DIndicesVerticesPair(
      positions[i],
      positions[i + 1],
      thickness,
      i * 4
    );

    builder.appendIndices(indices);
    builder.appendVerticesInterleaved(vertices);
  }

  const segments = 16;
  const radius = thickness / 2;
  const linesIndicesOffset = (positions.length - 1) * 4;

  for (let i = 0; i < positions.length; ++i) {
    const [indices, vertices] = makeCircle2DIndicesVerticesPair(
      positions[i],
      radius,
      segments,
      linesIndicesOffset + i * segments
    );

    builder.appendIndices(indices);
    builder.appendVerticesInterleaved(vertices);
  }

  builder.updateMesh();

  return builder.getMesh();
}

/**
 * Making line indices vertices pair
 */
function makeLine2DIndicesVerticesPair(start, end, thickness, indicesOffset) {
  const halfThickness = thickness / 2;
  const up = vec3.forward();
  const direction = end.sub(start).normalize();
  const right = up.cross(direction).normalize().uniformScale(halfThickness);

  return [
    // indices
    [
      0 + indicesOffset,
      1 + indicesOffset,
      2 + indicesOffset,
      2 + indicesOffset,
      1 + indicesOffset,
      3 + indicesOffset,
    ],
    // vertices
    [
      start.x + right.x,
      start.y + right.y,
      start.z + right.z,
      start.x - right.x,
      start.y - right.y,
      start.z - right.z,
      end.x + right.x,
      end.y + right.y,
      end.z + right.z,
      end.x - right.x,
      end.y - right.y,
      end.z - right.z,
    ],
  ];
}

// Config bindings
// =====

/**
 * Assign the renderLayer to all the content on the content anchor
 */
function onContentMaskRenderLayer(renderLayer) {
  forEachSceneObjectInSubHierarchy(mapCenter, function (sceneObject) {
    sceneObject.layer = renderLayer;
  });
}

/**
 * If the grid view scrolls, stop moving the view
 */
function onScrollingStarted() {
  shouldFollowMapLocation = false;
  viewScrolled = true;
}

/**
 *  Every tile the map updates it layout
 */
function onLayout() {
  pinOffsetter.layoutScreenTransforms(gridView);
}

// Helper functions
// =====

// |Map| Get the offset of a tile for a given location in terms of the scroll views dimensions
function getOffsetForLocation(config, initialLocation, latitude, longitude) {
  var tileOffsetForLocation = script.mapModule.longLatToImageRatio(
    latitude,
    longitude,
    initialLocation
  );

  // Align the user position with the top left of the grid
  return new vec2(
    -tileOffsetForLocation.x * config.horizontalLengthRelativeToParent,
    -tileOffsetForLocation.y * config.verticalLengthRelativeToParent
  );
}

// |UI| Add image component with a material (and optional render layer)
function addImageComponentWithMaterial(
  screenTransform,
  material,
  optionalRenderLayer
) {
  var sceneObject = screenTransform.getSceneObject();
  var imageComponent = sceneObject.createComponent("Image");
  if (material) {
    imageComponent.clearMaterials();
    imageComponent.addMaterial(material);
  }
  if (typeof optionalRenderLayer !== "undefined") {
    sceneObject.layer = optionalRenderLayer;
  }

  imageComponent.setRenderOrder(mapRenderOrder);
  return imageComponent;
}

// |UI| Get screen transform width.
function getScreenTransformWorldWidth(screenTransform) {
  return screenTransform
    .localPointToWorldPoint(new vec2(-1, -1))
    .distance(screenTransform.localPointToWorldPoint(new vec2(1, -1)));
}

// |UI| Get the relative height of a screen transform to its parent (between 0 and 1) from a world height.
function getWorldWidthToRelativeToParentWidth(
  parentScreenTransform,
  worldWidth
) {
  return worldWidth / getScreenTransformWorldWidth(parentScreenTransform);
}

// |UI| Get screen transform height
function getScreenTransformWorldHeight(screenTransform) {
  return screenTransform
    .localPointToWorldPoint(new vec2(-1, 1))
    .distance(screenTransform.localPointToWorldPoint(new vec2(-1, -1)));
}

// |UI| Get the relative height of a screen transform to its parent (between 0 and 1) from a world height.
function getWorldHeightToRelativeToParentHeight(
  parentScreenTransform,
  worldHeight
) {
  return worldHeight / getScreenTransformWorldHeight(parentScreenTransform);
}

// |Time| Will call a callback function every frame for a set duration with a number increasing from 0 to 1.
function makeTween(callback, duration) {
  var updateEvent = script.createEvent("LateUpdateEvent");
  var startTime = getTime();
  var hasRemovedEvent = false;
  updateEvent.bind(function () {
    if (getTime() > startTime + duration) {
      hasRemovedEvent = true;
      script.removeEvent(updateEvent);
      callback(1);
    } else {
      callback((getTime() - startTime) / duration);
    }
  });
  return {
    cancel: function () {
      if (!hasRemovedEvent) {
        hasRemovedEvent = true;
        script.removeEvent(updateEvent);
      }
    },
  };
}

// |SceneObject| Have an iterator function called on each SceneObject in a sub tree. Optionally [defaulting to true] including the scene object starting scene object.
function forEachSceneObjectInSubHierarchy(sceneObject, fn, includeSelf) {
  if (typeof includeSelf === "undefined" || includeSelf) {
    fn(sceneObject);
  }
  for (var i = 0; i < sceneObject.getChildrenCount(); i++) {
    var childSceneObject = sceneObject.getChild(i);
    fn(childSceneObject);
    forEachSceneObjectInSubHierarchy(childSceneObject, fn, false);
  }
}

// Interpolating between rotations
function interpolate(startRotation, endRotation, peakVelocity) {
  var step = peakVelocity * getDeltaTime();
  return quat.slerp(startRotation, endRotation, step);
}

// |Math| Returns a number between two numbers.
function lerp(start, end, scalar) {
  return start + (end - start) * scalar;
}

// |UI| Sets a screen transform position and size relative to parent. Left to right is x 0 to 1. Top to bottom is y 0 to 1.
function setScreenTransformRect01(screenTransform, x, y, width, height) {
  screenTransform.anchors.left = lerp(-1, 1, x);
  screenTransform.anchors.right = screenTransform.anchors.left + width * 2;
  screenTransform.anchors.top = lerp(1, -1, y);
  screenTransform.anchors.bottom = screenTransform.anchors.top - height * 2;
}

function getSceneRoot(sceneObject) {
  var parent = sceneObject.getParent();
  var currentSceneObject = sceneObject;

  while (parent !== null) {
    currentSceneObject = parent;
    parent = parent.getParent();
  }

  return currentSceneObject;
}

function setDimensions() {
  var transform = mapScreenTransform;

  var anchors = transform.anchors;

  var left = anchors.left;
  var right = anchors.right;
  var top = anchors.top;
  var bottom = anchors.bottom;

  var bottomLeftAnchorWorldPosition = transform.localPointToWorldPoint(
    new vec2(-1, -1)
  );

  var bottomLeftAnchorParentPosition = transform.worldPointToParentPoint(
    bottomLeftAnchorWorldPosition
  );

  var topRightAnchorWorldPosition = transform.localPointToWorldPoint(
    new vec2(1, 1)
  );

  var topRightAnchorParentPosition = transform.worldPointToParentPoint(
    topRightAnchorWorldPosition
  );

  left = bottomLeftAnchorParentPosition.x;
  right = topRightAnchorParentPosition.x;
  top = topRightAnchorParentPosition.y;
  bottom = bottomLeftAnchorParentPosition.y;

  var transformTotalWidth = Math.abs(right - left);
  var mappedUvWidth = map(transformTotalWidth, 0, 2, 0, 1);
  script.maskMaterial.mainPass.widthDivider = mappedUvWidth;

  var transformTotalHeight = Math.abs(top - bottom);
  var mappedUvHeight = map(transformTotalHeight, 0, 2, 0, 1);
  script.maskMaterial.mainPass.heightDivider = mappedUvHeight;
}

// |Math| Maps a number to a different interval. With optional clamping and easing.
function map(input, inputMin, inputMax, outputMin, outputMax) {
  input = (input - inputMin) / (inputMax - inputMin);
  var output = input * (outputMax - outputMin) + outputMin;
  return output;
}
