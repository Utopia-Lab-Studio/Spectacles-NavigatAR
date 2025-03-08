import {ToggleButton} from "SpectaclesInteractionKit/Components/UI/ToggleButton/ToggleButton";

@component
export class ToggleTest extends BaseScriptComponent {
    
    @input
    private toggle : ToggleButton;
    
    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
           this.onStart();
        });
    }

    private onStart() {
        this.toggleButton();
    }

    private toggleButton() {
        let delayedCallbackEvent = this.createEvent("DelayedCallbackEvent");
        delayedCallbackEvent.bind((eventData) => {
            this.toggle.isToggledOn = !this.toggle.isToggledOn;
            //this.toggle.toggle();

            this.toggleButton();
        });
        delayedCallbackEvent.reset(2);
    }
}