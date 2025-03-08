
const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionConfiguration = SIK.InteractionConfiguration;

// @input Component.DeviceTracking deviceTracking
// @input Component.Text transform_txt
// @input SceneObject north_panel

function onAwake() {
  // Wait for other components to initialize by deferring to OnStartEvent.
  script.createEvent('OnStartEvent').bind(() => {
    onStart();
  });
}

function onStart() {
  global.currentHeading = 0;
}

onAwake();


//
function compareAngles90(sourceAngle, otherAngle)
{
    // sourceAngle and otherAngle should be in the range -180 to 180
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

    if((difference > 75) && (difference < 105))
        return true;
    if((difference < -75) && (difference > -105))
        return true;

    return false;
}


var count = 0;
global.startTimer = false;


// Bind an event to run every frame
script.createEvent("UpdateEvent").bind(function()
{
    var basicTransform = script.deviceTracking.getTransform();
    global.deviceTransform = basicTransform;
    var position = basicTransform.getWorldPosition();
    var q = basicTransform.getWorldRotation();
    var yaw = Math.asin(-2.0*(q.x*q.z - q.w*q.y));
    var pitch = Math.atan2(2.0*(q.y*q.z + q.w*q.x), q.w*q.w - q.x*q.x - q.y*q.y + q.z*q.z);
    
    // 0-90: yaw(0,-pi), |pitch| < 2
    // 90-180: yaw (-pi,0), |pitch| > 2
    // 180-270: yaw (0,pi), |pitch| > 2
    // 270-360: yaw (pi,0), |pitch| < 2
    var angle = 0;
    if (Math.abs(pitch) < 2){
    	if(yaw < 0){
    		// 0-90
    		angle = Math.ceil((Math.abs(yaw)*2/Math.PI)*90);
    	}else{
    		// 270-360
    		angle = 360 - Math.ceil((yaw*2/Math.PI)*90);
    	}
    }else{
    	if(yaw < 0){
    		// 90-180
    		angle = 180 - Math.ceil((Math.abs(yaw)*2/Math.PI)*90);
    	}else{
    		// 180-270
    		angle = 180 + Math.ceil((yaw*2/Math.PI)*90);
    	}
    }
    angle = angle % 360;
    global.device_angle = angle;

    var angleRad = angle * Math.PI/180;
    var rotationToApply = quat.fromEulerAngles(0,-angleRad,0);
    script.north_panel.getTransform().setLocalRotation(rotationToApply);

    script.transform_txt.text = String(position) + "\n" + String(global.device_angle)
    							+ " , " + String((global.currentHeading)%360);
    //print('Device angle: ' + global.device_angle.toFixed(3));
    //print('CurrenHeading: ' + global.currentHeading.toFixed(3));


    // used during navigating, check global.turnSuccess
    var rot90 = compareAngles90(global.pathAngle, global.device_angle);
    if(rot90 && (global.naviState == 1) && !global.startTimer){
        global.startTimer = true;
        count = 0;
        print("start timer");
    }
    if (rot90 && global.startTimer){
        count++;
        print(count);
    } else if(!rot90 && global.startTimer){
        count = 0;
    }
    if(count > 20){  // around 0.5 sec
      global.turnSuccess = true;
      count = 0;
    }

});














