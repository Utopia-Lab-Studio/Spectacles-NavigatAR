const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionConfiguration = SIK.InteractionConfiguration;

//@input SceneObject toggle1_obj
//@input SceneObject toggle2_obj

var toggle1
var toggle2


function onAwake() {
  // Wait for other components to initialize by deferring to OnStartEvent.
  script.createEvent('OnStartEvent').bind(() => {
    onStart();
  });
}

function onStart() {
  // This script assumes that a ToggleButton (and Interactable + Collider) component have already been instantiated on the SceneObject.
  

  // var onStateChangedCallback = (state) => {
  //   print(`The toggle button has been triggered, setting to state: ${state}`);
  // };

  // toggleButton.onStateChanged.add(onStateChangedCallback);
  
}


script.toggleCallback = function (state){
	toggle1 = script.toggle1_obj.getComponent(
	    interactionConfiguration.requireType('ToggleButton')
	  );
	  toggle2 = script.toggle2_obj.getComponent(
	    interactionConfiguration.requireType('ToggleButton')
	  );
    toggle1.isToggledOn = !toggle1.isToggledOn;
    toggle2.isToggledOn = !toggle2.isToggledOn;
    print(toggle1.isToggledOn);
    print(toggle1.isToggledOn);
}


onAwake();