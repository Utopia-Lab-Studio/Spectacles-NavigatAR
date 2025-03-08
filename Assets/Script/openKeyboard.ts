//import { PinchButton } from "SpectaclesInteractionKit/Components/UI/PinchButton/PinchButton";

require("LensStudio:TextInputModule");


@component
export class TextInputSystemSample extends BaseScriptComponent {
  //pinchButton: PinchButton;

  private keyboardIsActive: boolean = false;

  private options: TextInputSystem.KeyboardOptions;
  private inputTxt: string;

  onAwake() {
    //this.pinchButton = this.sceneObject.getComponent(PinchButton.getTypeName());

    this.options = new TextInputSystem.KeyboardOptions();
    this.options.keyboardType = TextInputSystem.KeyboardType.Text;
    this.options.returnKeyType = TextInputSystem.ReturnKeyType.Done;
    this.options.enablePreview = true;

    this.options.onReturnKeyPressed = () => {
      this.keyboardIsActive = false;
      (global as any).passToJS_confirmText(this.inputTxt);
    };
    this.options.onTextChanged = (text, range) => {
      //print(text);
      this.inputTxt = text;
      (global as any).passToJS_updateText(this.inputTxt);
    };

    // this.pinchButton.onButtonPinched.add(() => {
    //   if (this.keyboardIsActive) {
    //     return;
    //   }
    //   this.keyboardIsActive = true;
    //   global.textInputSystem.requestKeyboard(options);
    // });
  }

  openKeyboard(){
      print("open keyboard");
     if (this.keyboardIsActive) {
        return;
      }
      this.keyboardIsActive = true;
      global.textInputSystem.requestKeyboard(this.options);
  }
}
