// -----JS CODE-----
// TTSExample.js
// Version: 0.1.0
// Event: On Awake
// Description: Global TTS Controller API Usage


//@input string text

if(script.text!==""){
    global.getTTSResults(script.text); 
}else{
    print("ERROR: Please input TTS Text");
}
