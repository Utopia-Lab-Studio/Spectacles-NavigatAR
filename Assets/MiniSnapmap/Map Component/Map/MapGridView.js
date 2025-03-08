// mapGridView
// Version: 1.0.0
// Description: Module for creating a grid view.
// Copyright (c) 2023 Snap Inc.

exports.makeGridView = makeGridView;
exports.makeConfig = makeConfig;
exports.getOffsetToAlignCells = getOffsetToAlignCells;

function makeConfig() {
  return {
    mapScreenTransform: null,

    // Horizontal
    horizontalScrollingEnabled: true,
    horizontalMinIndex: 1,
    horizontalMaxIndex: -1,
    horizontalLengthRelativeToParent: 0.5,

    // Vertical
    verticalScrollingEnabled: true,
    verticalMinIndex: 1,
    verticalMaxIndex: -1,
    verticalLengthRelativeToParent: 0.5,

    // Updating
    onContentMaskRenderLayer: function () { },
    onShouldConfigureCell: function () { },
    onContainerScreenTransformDimensionsChanged: function () { },
    onLayout: function () { },
    onScrollingStarted: function () { },
  };
}

function makeGridView(script) {
  var config;
  var needsLayout = false;
  var hasInitialized = false;
  var cells = [];
  var isTouching = false;
  var isDragging = false;
  var hasDragged = false;
  var initialLocalTouchPosition = vec2.zero();
  var lastTouchPosition = vec2.zero();
  var velocity = vec2.zero();
  var maxVelocity = 6;
  var currentOffset = vec2.zero();
  var draggingOffset = vec2.zero();
  var lastOffset = vec2.zero();
  var lastTouchMoveTime = 0;
  var lastScreenTransformBounds;
  var screenTransformMask;
  var screenPositionChangedDidChange = false;
  var shouldTriggerScrollingStarted = false;
  var hasTriggeredScrollingStarted = false;

  // Called when a new configuration for the grid view
  // is applied.
  // Will initialize events if they haven't already been

  function handleUpdateConfig(newConfig) {
    config = newConfig;
    needsLayout = true;

    if (!hasInitialized) {
      lastScreenTransformBounds = getScreenTransformPositionsAsArray(
        config.mapScreenTransform
      );
      hasInitialized = true;
      screenPositionChangedDidChange = true;
      global.touchSystem.touchBlocking = true;

      script.createEvent("TouchStartEvent").bind(function (touchEvent) {
        if (
          config.horizontalScrollingEnabled ||
          config.verticalScrollingEnabled
        ) {
          if (
            wasClicked(config.mapScreenTransform, touchEvent.getTouchPosition())
          ) {
            isTouching = true;
            setVec2(
              initialLocalTouchPosition,
              config.screenTransform.screenPointToLocalPoint(
                touchEvent.getTouchPosition()
              )
            );
            setVec2(lastTouchPosition, initialLocalTouchPosition);
            velocity = vec2.zero();
            draggingOffset = vec2.zero();
            isDragging == false;
            lastTouchMoveTime = getTime();
            shouldTriggerScrollingStarted = true;
          }
        }
      });

      script.createEvent("TouchMoveEvent").bind(function (touchEvent) {
        if (
          config.horizontalScrollingEnabled ||
          config.verticalScrollingEnabled
        ) {
          if (isTouching) {
            if (
              !hasTriggeredScrollingStarted &&
              shouldTriggerScrollingStarted
            ) {
              config.onScrollingStarted();
              hasTriggeredScrollingStarted = true;
            }
            needsLayout = true;
            screenPositionChangedDidChange = true;
            isDragging = true;
            hasDragged = true;
            var delta = getTime() - lastTouchMoveTime;
            if (delta <= 0) {
              return;
            }
            var currentLocalTouchPosition =
              config.screenTransform.screenPointToLocalPoint(
                touchEvent.getTouchPosition()
              );
            var touchOffset = currentLocalTouchPosition.sub(
              initialLocalTouchPosition
            );
            var constrainAxis = new vec2(
              config.horizontalScrollingEnabled ? 1 : 0,
              config.verticalScrollingEnabled ? 1 : 0
            );
            draggingOffset = touchOffset
              .mult(new vec2(0.5, -0.5))
              .mult(constrainAxis);
            var nextCurrentOffset = currentOffset.add(draggingOffset);
            // Dampen dragging if it dragging too far
            if (
              -(
                config.horizontalLengthRelativeToParent *
                config.horizontalMaxIndex -
                1 +
                config.horizontalLengthRelativeToParent
              ) < nextCurrentOffset.x ||
              -(
                config.horizontalLengthRelativeToParent *
                config.horizontalMinIndex +
                0
              ) > nextCurrentOffset.x ||
              -(
                config.verticalLengthRelativeToParent *
                config.verticalMaxIndex -
                1 +
                config.verticalLengthRelativeToParent
              ) < nextCurrentOffset.y ||
              -(
                config.verticalLengthRelativeToParent *
                config.verticalMinIndex +
                0
              ) > nextCurrentOffset.y
            ) {
              draggingOffset = draggingOffset.uniformScale(0.333);
            }
            lastTouchMoveTime = getTime();
            var scale = delta * 600;
            var acceleration = currentLocalTouchPosition
              .sub(lastTouchPosition)
              .mult(new vec2(scale, -scale))
              .mult(constrainAxis);
            velocity = velocity.add(acceleration.sub(velocity));
            setVec2(lastTouchPosition, currentLocalTouchPosition);
          }
        }
      });

      script.createEvent("TouchEndEvent").bind(function (touchEvent) {
        if (
          config.horizontalScrollingEnabled ||
          config.verticalScrollingEnabled
        ) {
          if (isTouching) {
            isTouching = false;
            if (hasDragged) {
              hasDragged = false;
              currentOffset = currentOffset.add(draggingOffset);
              clampCurrentOffset();
              draggingOffset = vec2.zero();
            }
            shouldTriggerScrollingStarted = false;
            hasTriggeredScrollingStarted = false;
          }
        }
      });

      script.createEvent("LateUpdateEvent").bind(function () {
        if (
          !compareScreenTransformsPositionsArray(
            getScreenTransformPositionsAsArray(config.mapScreenTransform),
            lastScreenTransformBounds
          )
        ) {
          if (screenTransformMask) {
            screenTransformMask.updateBounds();
          }
          config.onContainerScreenTransformDimensionsChanged();
          lastScreenTransformBounds = getScreenTransformPositionsAsArray(
            config.mapScreenTransform
          );
          needsLayout = true;
          screenPositionChangedDidChange = true;
        }

        if (!isTouching) {
          // Friction
          velocity = velocity.sub(
            velocity.uniformScale(0.993).uniformScale(getDeltaTime())
          );
          // Clamp velocity
          velocity = velocity.clampLength(maxVelocity);
          // Calculate offset
          currentOffset = currentOffset.add(
            velocity.uniformScale(getDeltaTime())
          );
          if (currentOffset.sub(lastOffset).length > 0.00001) {
            screenPositionChangedDidChange = true;
            lastOffset = currentOffset;
            clampCurrentOffset();
            needsLayout = true;
          } else {
            velocity = vec2.zero();
          }
        }

        if (needsLayout) {
          layoutCells();
        }

        if (screenPositionChangedDidChange) {
          screenPositionChangedDidChange = false;
          cells.forEach(function (cell) {
            cell.onScreenPositionChanged();
          });
        }
      });

      function clampCurrentOffset(callback) {
        currentOffset.x = clamp(
          -(
            config.horizontalLengthRelativeToParent *
            config.horizontalMaxIndex -
            1 +
            config.horizontalLengthRelativeToParent
          ),
          -(
            config.horizontalLengthRelativeToParent *
            config.horizontalMinIndex +
            0
          ),
          currentOffset.x,
          callback
        );
        currentOffset.y = clamp(
          -(
            config.verticalLengthRelativeToParent * config.verticalMaxIndex -
            1 +
            config.verticalLengthRelativeToParent
          ),
          -(
            config.verticalLengthRelativeToParent * config.verticalMinIndex +
            0
          ),
          currentOffset.y,
          callback
        );
      }
    }

    // Calculate number of cells need for each direction
    // Create or destroy cells to get to the needed number
    // Flag position needs updated

    var cellCountHorizontal =
      1 + Math.ceil(1 / config.horizontalLengthRelativeToParent) + 2;
    var cellCountVertical =
      1 + Math.ceil(1 / config.verticalLengthRelativeToParent);
    var neededCellsCount = cellCountHorizontal * cellCountVertical;

    // Ensure there are enough cells by creating or destroying them
    if (neededCellsCount !== cells.length) {
      needsLayout = true;
      var difference = neededCellsCount - cells.length;
      if (difference < 0) {
        // Remove cells
        for (var i = 0; i < Math.abs(difference); i++) {
          var cellToRemove = cells.pop();
          if (isFunction(cellToRemove.onShouldDestroy)) {
            cellToRemove.onShouldDestroy();
          }
        }
      } else if (difference > 0) {
        // Add cells
        for (var i = 0; i < difference; i++) {
          var cell = makeCell();
          var screenTransform = createChildScreenTransform(
            config.screenTransform,
            "Cell" + cells.length + 1
          );
          cell.sceneObject = screenTransform.getSceneObject();
          if (screenTransformMask) {
            screenTransform.layer = screenTransformMask.renderLayer;
            cell.renderLayer = screenTransformMask.renderLayer;
          } else {
            cell.renderLayer = config.screenTransform.getSceneObject().layer;
          }
          cell.screenTransform = screenTransform;
          setScreenTransformRect01(
            screenTransform,
            0,
            0,
            config.horizontalLengthRelativeToParent,
            config.verticalLengthRelativeToParent
          );
          config.onShouldConfigureCell(cell);
          cells.push(cell);
        }
      }
    }
  }

  function layoutCells() {
    needsLayout = false;

    var cellCountHorizontal =
      1 + Math.ceil(1 / config.horizontalLengthRelativeToParent) + 2;
    var cellCellsHorizontalLength =
      config.horizontalLengthRelativeToParent * cellCountHorizontal;
    var cellCountVertical =
      1 + Math.ceil(1 / config.verticalLengthRelativeToParent);
    var allCellsVerticalLength =
      config.verticalLengthRelativeToParent * cellCountVertical;

    var offset = currentOffset.add(draggingOffset);

    var needle = -1;
    for (var x = 0; x < cellCountHorizontal; x++) {
      for (var y = 0; y < cellCountVertical; y++) {
        var cell = cells[++needle];

        var targetXOffset =
          x * config.horizontalLengthRelativeToParent + offset.x;
        var targetYOffset =
          y * config.verticalLengthRelativeToParent + offset.y;

        var wrappedXOffset =
          mod(targetXOffset, cellCellsHorizontalLength) -
          config.horizontalLengthRelativeToParent * 3;
        var wrappedYOffset =
          mod(targetYOffset, allCellsVerticalLength) -
          config.verticalLengthRelativeToParent;

        setScreenTransformRect01(
          cell.screenTransform,
          wrappedXOffset,
          wrappedYOffset,
          config.horizontalLengthRelativeToParent,
          config.verticalLengthRelativeToParent
        );

        // Index calculations
        var targetHorizontalIndex = Math.round(
          (wrappedXOffset - offset.x + 0.001) /
          config.horizontalLengthRelativeToParent
        );
        var targetVerticalIndex = Math.floor(
          (wrappedYOffset - offset.y + 0.001) /
          config.verticalLengthRelativeToParent
        );

        // Update cell data
        var indexChanged = false;
        var indexInHorizontalRange =
          config.horizontalAllowOutOfIndexRange ||
          (targetHorizontalIndex >= config.horizontalMinIndex &&
            targetHorizontalIndex <= config.horizontalMaxIndex);
        var indexInVerticalRange =
          config.verticalAllowOutOfIndexRange ||
          (targetVerticalIndex >= config.verticalMinIndex &&
            targetVerticalIndex <= config.verticalMaxIndex);

        if (indexInHorizontalRange && indexInVerticalRange) {
          if (targetHorizontalIndex !== cell.horizontalIndex) {
            cell.horizontalIndex = targetHorizontalIndex;
            indexChanged = true;
          }
          if (targetVerticalIndex !== cell.verticalIndex) {
            cell.verticalIndex = targetVerticalIndex;
            indexChanged = true;
          }
        }

        if (
          cell.sceneObject.enabled &&
          (!indexInHorizontalRange || !indexInVerticalRange)
        ) {
          cell.onDisabled();
          cell.sceneObject.enabled = false;
        }

        if (
          !cell.sceneObject.enabled &&
          indexInHorizontalRange &&
          indexInVerticalRange
        ) {
          cell.onEnabled();
          cell.sceneObject.enabled = true;
        }

        if (indexChanged) {
          cell.onDataChanged();
        }
      }
    }
    lastScreenTransformBounds = getScreenTransformPositionsAsArray(
      config.mapScreenTransform
    );
    config.onCellCountChanged(cellCountHorizontal * cellCountVertical);
    config.onLayout();
  }

  function handleReloadData() {
    cells.forEach(function (cell) {
      var indexInHorizontalRange =
        config.horizontalAllowOutOfIndexRange ||
        (cell.horizontalIndex >= config.horizontalMinIndex &&
          cell.horizontalIndex <= config.horizontalMaxIndex);
      var indexInVerticalRange =
        config.verticalAllowOutOfIndexRange ||
        (cell.verticalIndex >= config.verticalMinIndex &&
          cell.verticalIndex <= config.verticalMaxIndex);

      if (indexInHorizontalRange && indexInVerticalRange) {
        cell.onDataChanged();
      }
    });
  }

  function makeCell() {
    return {
      renderLayer: null,
      horizontalIndex: -Infinity,
      verticalIndex: -Infinity,
      screenTransform: null,
      sceneObject: null,
      onScreenPositionChanged: function () { },
      onDataChanged: function () { },
      onTapped: function () { },
      onShouldDestroy: function () { },
      onEnabled: function () { },
      onDisabled: function () { },
    };
  }

  return {
    updateConfig: handleUpdateConfig,
    reloadData: handleReloadData,
    getOffsetToAlignCells: getOffsetToAlignCells,
    getOffset: function () {
      return currentOffset.add(draggingOffset);
    },
    setOffset: function (offset) {
      var targetOffset = offset.sub(draggingOffset);
      if (
        targetOffset.x !== currentOffset.x ||
        targetOffset.y !== currentOffset.y
      ) {
        screenPositionChangedDidChange = true;
        needsLayout = true;
        currentOffset.x = targetOffset.x;
        currentOffset.y = targetOffset.y;
      }
    },
    resetVelocity: function () {
      velocity = vec2.zero();
    },
    getConfig: function () {
      return config;
    },
    onCellCountChanged: function (cellCount) { },
  };
}
// Returns an offset for a grid view to align it cells. For example 0.5 for horizontalAlignment and verticalAlignment will
// centre the cells. 0 for horizontalAlignment and 1 verticalAlignment will bottom left align the cells.
function getOffsetToAlignCells(config, horizontalAlignment, verticalAlignment) {
  var cellCountHorizontal =
    1 + Math.ceil(1 / config.horizontalLengthRelativeToParent) + 2;
  var cellCellsHorizontalLength =
    config.horizontalLengthRelativeToParent * cellCountHorizontal;
  var cellCountVertical =
    1 + Math.ceil(1 / config.verticalLengthRelativeToParent);
  var allCellsVerticalLength =
    config.verticalLengthRelativeToParent * cellCountVertical;
  return new vec2(
    -(cellCellsHorizontalLength - 1) * horizontalAlignment,
    -(allCellsVerticalLength - 1) * verticalAlignment
  );
}

// Utils
// =====

// |UI| Determine is a screen transform is below a screen point and is active. Handy for touch & tap start events.

function wasClicked(screenTransform, screenPoint) {
  return (
    screenTransform.getSceneObject().isEnabledInHiearchy &&
    screenTransform.containsScreenPoint(screenPoint)
  );
}

// |Math| Set vec2
function setVec2(v, source) {
  v.x = source.x;
  v.y = source.y;
}

// |Comparison| Checks if a value is a valid function
function isFunction(fn) {
  return typeof fn === "function";
}

// |UI| Create child screen transform
function createChildScreenTransform(parentScreenTransform, name) {
  var sceneObject = global.scene.createSceneObject(
    name || "Screen Transform Scene Object"
  );
  sceneObject.setParent(parentScreenTransform.getSceneObject());
  var screenTransform = sceneObject.createComponent("ScreenTransform");
  return screenTransform;
}

// |UI| Get parent camera with optional `Camera.Type` filter. Handy for access the render layer with making images with code. E.g. `getParentCamera(script.getSceneObject, Camera.Type.Orthographic)`

function getParentCamera(sceneObject, type) {
  var camera = null;
  var parent = sceneObject.getParent();

  while (parent) {
    camera = parent.getComponent("Component.Camera");
    if (camera) {
      if (!type) {
        if (camera.type == type) {
          return camera;
        }
      } else {
        return camera;
      }
    }
    parent = parent.getParent();
  }

  return null;
}

// |Math| Returns a number between two numbers.

function lerp(start, end, scalar) {
  return start + (end - start) * scalar;
}

// |Math| Returns how far between two numbers a number is.

function inverseLerp(start, end, scalar) {
  return (scalar - start) / (end - start);
}

// |UI| Set a screen transform (in a similar way to how our brains work) with a relative to parent position and size.

function setScreenTransformRect01(screenTransform, x, y, width, height) {
  screenTransform.anchors.left = lerp(-1, 1, x);
  screenTransform.anchors.right = screenTransform.anchors.left + width * 2;
  screenTransform.anchors.top = lerp(1, -1, y);
  screenTransform.anchors.bottom = screenTransform.anchors.top - height * 2;
}

// |Math| Javascript native mod function only returns the remainder. This function acts like a modulo function.

function mod(n, m) {
  return ((n % m) + m) % m;
}

// |UI| Get screen transform width

function getScreenTransformWorldWidth(screenTransform) {
  return screenTransform
    .localPointToWorldPoint(new vec2(-1, -1))
    .distance(screenTransform.localPointToWorldPoint(new vec2(1, -1)));
}

// |UI| Get screen transform height

function getScreenTransformWorldHeight(screenTransform) {
  return screenTransform
    .localPointToWorldPoint(new vec2(-1, 1))
    .distance(screenTransform.localPointToWorldPoint(new vec2(-1, -1)));
}

// |Math| Clamp a value to a range

function clamp(value, min, max, callbackOnClamp) {
  if (max < min) {
    if (value < max) {
      if (typeof callbackOnClamp === "function") {
        callbackOnClamp(value, max);
      }
      value = max;
    } else if (value > min) {
      if (typeof callbackOnClamp === "function") {
        callbackOnClamp(value, min);
      }
      value = min;
    }
  } else {
    if (value > max) {
      if (typeof callbackOnClamp === "function") {
        callbackOnClamp(value, max);
      }
      value = max;
    } else if (value < min) {
      if (typeof callbackOnClamp === "function") {
        callbackOnClamp(value, min);
      }
      value = min;
    }
  }
  return value;
}

// |UI| Get screen transform positions as array. Useful for checking is a screen transforms bounds changed with [compare-screen-transforms-positions-array](./compare-screen-transforms-positions-array.js).

function getScreenTransformPositionsAsArray(screenTransform) {
  return [
    screenTransform.localPointToWorldPoint(vec2.zero()),
    screenTransform.localPointToWorldPoint(vec2.one()),
  ];
}

// |UI| Compare screen transform positions array. Useful for checking is a screen transforms bounds changed with [get-screen-transform-positions-as-array](./get-screen-transform-positions-as-array.js).

function compareScreenTransformsPositionsArray(a, b) {
  return a.toString() === b.toString();
}
