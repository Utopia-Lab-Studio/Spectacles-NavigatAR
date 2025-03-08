//@input Asset.VoiceMLModule vmlModule {"label": "Voice ML Module"}

// @input Component.ScriptComponent findPlace_Script
// @input Component.Text voice_txt
// @input Component.ScriptComponent keyboard_Script
// @input SceneObject hint_panel



var options = VoiceML.ListeningOptions.create();
options.speechRecognizer = VoiceMLModule.SpeechRecognizer.Default;
options.languageCode = 'en_US';
//General Option for Transcription
options.shouldReturnAsrTranscription = true;



var onListeningEnabledHandler = function () {
  script.vmlModule.startListening(options);
};

var onListeningDisabledHandler = function () {
  script.vmlModule.stopListening();
};

script.enableMic = function (){ 
    print("start mic");
    script.vmlModule.startListening(options);
}

script.disableMic = function (){ 
    print("stop mic");
    script.vmlModule.stopListening();
    script.voice_txt.enabled = false;

}

var onListeningErrorHandler = function (eventErrorArgs) {
  print(
    'Error: ' + eventErrorArgs.error + ' desc: ' + eventErrorArgs.description
  );
};

var onUpdateListeningEventHandler = function (eventArgs) {
    if (eventArgs.transcription.trim() == '') {
    return;
    }
    print('Transcription: ' + eventArgs.transcription);
    
    if(script.hint_panel.enabled){
      script.voice_txt.enabled = true;
    }
    script.voice_txt.text = eventArgs.transcription;
    
    if (!eventArgs.isFinalTranscription) {
    return;
    }
    print('Final Transcription: ' + eventArgs.transcription);
    script.voice_txt.text = eventArgs.transcription;
    global.voiceCmd = eventArgs.transcription.toLowerCase();

  
    // cmd list
    let contain_search = global.voiceCmd.toLowerCase().includes("search");
    let contain_find = global.voiceCmd.toLowerCase().includes("find");
    let contain_take = global.voiceCmd.toLowerCase().includes("take");
    let contain_keyboard = global.voiceCmd.toLowerCase().includes("keyboard");


    if(contain_search || contain_find){
        script.findPlace_Script.cmd_find();
        global.hideHint = true;
        script.hint_panel.enabled = false;
    }else if(contain_take){
        script.findPlace_Script.cmd_goto();
        global.hideHint = true;
        script.hint_panel.enabled = false;
    }else if(contain_keyboard){
        script.keyboard_Script.openKeyboard();
        global.hideHint = true;
        script.hint_panel.enabled = false;
    }


    script.voice_txt.text = "";
    
};

//VoiceML Callbacks
script.vmlModule.onListeningUpdate.add(onUpdateListeningEventHandler);
script.vmlModule.onListeningError.add(onListeningErrorHandler);
script.vmlModule.onListeningEnabled.add(onListeningEnabledHandler);
script.vmlModule.onListeningDisabled.add(onListeningDisabledHandler);