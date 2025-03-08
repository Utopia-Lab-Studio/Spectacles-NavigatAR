const SIK = require('SpectaclesInteractionKit/SIK').SIK;
const interactionConfiguration = SIK.InteractionConfiguration;

//@input Asset.ObjectPrefab songItemPrefab
//@input Asset.ObjectPrefab placeItemPrefab
// @input Component.ScriptComponent findPlace_Script


global.numScrollItem = 0;
global.togglePlace = [];
global.toggleCreated = false; 


script.cmd_createList = function (len, instructionStep, distanceStep,idx){
    print("create list");
    var yStart = -10;
    //-6 (2 line) -8 (3 line), -12 (5 line)
    var yOffset = yStart;
    //print(len);
    global.numScrollItem = len;
    for (var i = 0; i < len; i++) {
        var item = script.songItemPrefab.instantiate(script.getSceneObject());
        var screenTransform = item.getComponent("Component.ScreenTransform");

        // #line needed for instruction
        //  - 25 char / line
        var numline = 0;    
        var numline_inst = 0;
        var firstEnd = 0;
        var firstPart = "";
        var onlyInstTxt = "";
        var strlen = 0;
        if(instructionStep[i].includes("Restricted")){
            firstEnd = instructionStep[i].indexOf("Restricted");
            firstPart = instructionStep[i].substring(0,firstEnd);
            onlyInstTxt = firstPart;
        }else{
            onlyInstTxt = instructionStep[i];
        }

        // break inst into multiple line
        var combineTxt = "";

        //print(i);
        //print(onlyInstTxt);
        while(onlyInstTxt.length > 0){
            
            if(onlyInstTxt.length <= 25){
                firstPart = onlyInstTxt.substring(0,25);
                onlyInstTxt = onlyInstTxt.substring(25,onlyInstTxt.length);
                //print("<25>" + firstPart + "<->" + onlyInstTxt);
            }else{
                if(onlyInstTxt.charAt(25) == " "){
                    firstPart = onlyInstTxt.substring(0,25);
                    onlyInstTxt = onlyInstTxt.substring(25,onlyInstTxt.length);
                    //print("25>" + firstPart + "<->" + onlyInstTxt);
                }else{
                    firstPart = onlyInstTxt.substring(0,25);
                    let lastIdx = firstPart.lastIndexOf(" ");
                    if(lastIdx == -1){
                        firstPart = onlyInstTxt.substring(0,25);
                        onlyInstTxt = onlyInstTxt.substring(25,onlyInstTxt.length);
                        //print("-1>" + firstPart + "<->" + onlyInstTxt);
                    }else if(lastIdx == 0){
                        firstPart = onlyInstTxt.substring(0,25);
                        onlyInstTxt = onlyInstTxt.substring(25,onlyInstTxt.length);
                        //print("0>" + firstPart + "<->" + onlyInstTxt);
                    }else{
                        firstPart = onlyInstTxt.substring(0,lastIdx);
                        onlyInstTxt = onlyInstTxt.substring(lastIdx,onlyInstTxt.length);
                        //print("idx>" + firstPart + "<->" + onlyInstTxt);
                    }
                }
            }
            combineTxt = combineTxt.concat(firstPart,"\n");
            numline_inst++;
        }

        item.getChild(0).getComponent("Component.Text").text = combineTxt;

        // set pos y of child(1,2)
        if(instructionStep[i].includes("Restricted")){
            numline = numline_inst + 2;     // restrict line + dist line
            item.getChild(1).enabled = true;
            item.getChild(1).getComponent("Component.ScreenTransform").anchors.top = 1 - 0.15*(numline_inst);
            item.getChild(2).getComponent("Component.ScreenTransform").anchors.top = 1 - 0.15*(numline_inst+1);
        }else{
            numline = numline_inst + 1;     // dist line
            item.getChild(1).enabled = false;
            item.getChild(2).getComponent("Component.ScreenTransform").anchors.top = 1 - 0.15*numline_inst;
        }

        // set each item size
        screenTransform.offsets.setCenter(new vec2(14, yOffset));
        yOffset = yOffset - (2 + numline*2); 

        // set hilight current state
        if(idx == i){
            item.getChild(0).getComponent("Component.Text").backgroundSettings.enabled = true;
            item.getChild(0).getComponent("Component.Text").backgroundSettings.fill.color = new vec4(1.0,1.0,0.0,0.5);
        }else{
            item.getChild(0).getComponent("Component.Text").backgroundSettings.enabled = false;
        }

        // dist txt
        item.getChild(2).getComponent("Component.Text").text = distanceStep[i] + "-----------------------------";

        // arrow icon
        if(instructionStep[i].includes("Turn right")){
            item.getChild(3).getComponent("Component.Text").text = "➡️";
        }else if(instructionStep[i].includes("Turn left")){
            item.getChild(3).getComponent("Component.Text").text = "⬅️";
        }else{
            item.getChild(3).getComponent("Component.Text").text = "⬆️";
        }
       //print(instructionStep[i]);
        
        item.enabled = true;
        //print("text split success");
    }
    global.toggleCreated = false;
}

script.cmd_placeList = function (len, placeName, placeDist){
    print("create place list");
    var yStart = -10; 
    //-6 (2 line) -8 (3 line), -12 (5 line)
    var yOffset = yStart;
    //print(len);
    global.numScrollItem = len+1;

    // dummy
    var item = script.placeItemPrefab.instantiate(script.getSceneObject());
    var screenTransform = item.getComponent("Component.ScreenTransform");
    screenTransform.offsets.setCenter(new vec2(14, yOffset));
    yOffset = yOffset - (2 + 2*2); 
    item.getChild(0).getComponent("Component.Text").text = "Near by places";
    item.getChild(1).getComponent("Component.ScreenTransform").anchors.top = 1 - 0.15*1;
    item.getChild(1).getComponent("Component.Text").text = "Select your destination";
    item.getChild(2).enabled = false;
    item.enabled = true;
    //
    for (var i = 0; i < len; i++) {
        var item = script.placeItemPrefab.instantiate(script.getSceneObject());
        var screenTransform = item.getComponent("Component.ScreenTransform");

        // set each item size
        screenTransform.offsets.setCenter(new vec2(14, yOffset));
        yOffset = yOffset - (2 + 2*2); 

        // name
        var combineTxt = "";
        combineTxt = combineTxt.concat(i+1,". ");
        combineTxt = combineTxt.concat(placeName[i]);
        item.getChild(0).getComponent("Component.Text").text = combineTxt;

        // dist
        item.getChild(1).getComponent("Component.ScreenTransform").anchors.top = 1 - 0.15*1;
        item.getChild(1).getComponent("Component.Text").text = placeDist[i].toFixed(1) + "m ---------------------------";

        // toggle
        item.getChild(2).getComponent("Component.ScreenTransform").offsets.setCenter(new vec2(-12, 14));
        global.togglePlace[i] = item.getChild(2).getComponent(
            interactionConfiguration.requireType('ToggleButton')
        );
        item.enabled = true;
        
        //global.togglePlace[i].isToggledOn = true;
        //print(global.togglePlace[i].isToggledOn);
        //print("text split success");
    }
    global.toggleCreated = true;
}

script.createEvent("UpdateEvent").bind(function()
{
    if(global.toggleCreated){
        for (var i = 0; i < (global.numScrollItem-1); i++) {
            if(global.togglePlace[i].isToggledOn){
                script.findPlace_Script.cmd_choosePlace(i);
                global.togglePlace[i].isToggledOn = false;
                script.cmd_destroyList();
                break;
            }
        }
    }
    
});

script.cmd_destroyList = function (){
    print("destroy list");
    for (var i = 0; i < global.numScrollItem; i++) {
        script.getSceneObject().getChild(0).destroy();
    }
    global.numScrollItem = 0;
}