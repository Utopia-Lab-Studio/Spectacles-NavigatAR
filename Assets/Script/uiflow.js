// main
// @input Component.Text voice_txt
// @input SceneObject info_button

// startup info
// @input SceneObject north_panel
// @input SceneObject hint_panel
// @input SceneObject dir_panel


function onAwake() {
    // Wait for other components to initialize by deferring to OnStartEvent.
    script.createEvent('OnStartEvent').bind(() => {
      onStart();
    });
  }
  
  function onStart() {
     script.voice_txt.enabled = false;
     script.info_button.enabled = false;
     script.north_panel.enabled = false;
     script.hint_panel.enabled = false;
  }
  
  onAwake();

// called when users click confirm north button
script.setNorth = function (data){
    print("set north");
    global.currentHeading = global.device_angle;
    script.north_panel.enabled = false;
    script.hint_panel.enabled = true;
    script.voice_txt.enabled = false;
    script.info_button.enabled = false;
    script.dir_panel.enabled = true;
}


// script.closeHint = function (data){
//     print("close hint");
//     script.hint_panel.enabled = false;
//     script.voice_txt.enabled = true;
//     script.info_button.enabled = true;
// }


