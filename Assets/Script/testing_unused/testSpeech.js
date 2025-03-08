const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionConfiguration = SIK.InteractionConfiguration;

// @input SceneObject info_button
// @input Component.ScriptComponent findPlace_Script
// @input SceneObject dirUI_obj

function onAwake() {
  // Wait for other components to initialize by deferring to OnStartEvent.
  script.createEvent('OnStartEvent').bind(() => {
    onStart();
  });
}

function onStart() {
  // This script assumes that a ToggleButton (and Interactable + Collider) component have already been instantiated on the SceneObject.
  var toggleButtonInfo = script.info_button.getComponent(
    interactionConfiguration.requireType('ToggleButton')
  );

  var onStateChangedCallback = (state) => {
    //print(`${state}`);
    if(state){
      //global.getTTSResults("go straight, turn left"); 
      var angleRad = global.device_angle * Math.PI/180;
      var dx = Math.sin(angleRad) * 50;
      var dz = Math.cos(angleRad) * -50;
      script.dirUI_obj.getTransform().setLocalPosition(new vec3(dx,0,dz));
      var rotationToApply = quat.angleAxis(-angleRad, vec3.up());
      script.dirUI_obj.getTransform().setLocalRotation(rotationToApply);
      var worldPos = global.deviceTransform.getWorldPosition();
      script.dirUI_obj.getTransform().setWorldPosition(new vec3(worldPos.x+dx,worldPos.y + 30,worldPos.z+dz));
      script.dirUI_obj.enabled = true;

    }else{
      script.dirUI_obj.enabled = false;

    }


  };

  toggleButtonInfo.onStateChanged.add(onStateChangedCallback);

}

onAwake();