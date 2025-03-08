//@input SceneObject objectWithTweens
//@input SceneObject sceneObjectReference

var visualComponent = script.sceneObjectReference.getComponent("Component.MaterialMeshVisual");
if (visualComponent == null) {
    return;
}
var pass = visualComponent.getMaterial(0).getPass(0);

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(toggleColors);
// Toggle between red, white, and blue based on value provided by TweenValue

function toggleColors() {
    var tweenValue = global.tweenManager.getGenericTweenValue(script.objectWithTweens, "tween_value");
    if (tweenValue <= 1) {
        pass.baseColor = new vec4(1, 0, 0, 1);
    } else if (tweenValue <= 2) {
        pass.baseColor = new vec4(1, 1, 1, 1);
    } else {
        pass.baseColor = new vec4(0, 0, 1, 1);
    }
}


