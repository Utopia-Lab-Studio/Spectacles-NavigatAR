import Event from "SpectaclesInteractionKit/Utils/Event";

@component
export class IntroSequence extends BaseScriptComponent {

    @input imageLogo : Image;
    @input imageText : Image;
    @input tutorialSequence : Image;
    @input tutorialImages : Texture[];

    public onIntroEnds : Event = new Event();

    private cachedTween : Tween<any>;
    private tutorialPanelCount = 0;

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
           this.onStart();
        });

        this.setImageColorAlpha(this.imageLogo, 0);
        this.setImageColorAlpha(this.imageText, 0);
        this.setImageColorAlpha(this.tutorialSequence, 0);
    }

    public startIntro() {
        this.tweenImageAlpha(this.imageLogo, 0, 1, 1000, 500, () => {});
        this.tweenImageAlpha(this.imageText, 0, 1, 1000, 500, () => {
            this.tweenImageAlpha(this.imageLogo, 1, 0, 500, 1000, () => {});
            this.tweenImageAlpha(this.imageText, 1, 0, 500, 1000, () => {
                this.onIntroEnds.invoke();
                this.playTutorialSequence();
            });
        });
    }

    public skipIntro() {
        if (this.cachedTween != null) {
            this.cachedTween.stop();
        }
        this.tweenImageAlpha(this.imageLogo, this.imageLogo.mainPass.baseColor.a, 0, 500, 0, () => {});
        this.tweenImageAlpha(this.imageText, this.imageText.mainPass.baseColor.a, 0, 500, 0, () => {});
        this.tweenImageAlpha(this.tutorialSequence, this.tutorialSequence.mainPass.baseColor.a, 0, 500, 0, () => {});
    }

    // Modified to call startIntro() when OnStartEvent fires
    private onStart() {
        this.startIntro();
    }

    private playTutorialSequence() {
        this.tutorialSequence.mainPass.baseTex = this.tutorialImages[this.tutorialPanelCount];
        this.setImageColorAlpha(this.tutorialSequence, 0);

        this.tweenImageAlpha(this.tutorialSequence, 0, 1, 500, 300, () => {
            this.tweenImageAlpha(this.tutorialSequence, 1, 0, 500, 4000, () => {
                this.tutorialPanelCount = (this.tutorialPanelCount + 1) % this.tutorialImages.length;
                this.playTutorialSequence();
            });
        });
    }

    private tweenImageAlpha(image : Image, startVal : number, endVal : number, duration : number, delay : number, onComplete : () => void) {
        this.setImageColorAlpha(image, startVal);

        this.cachedTween = new TWEEN.Tween({ x: startVal })
            .to({ x: endVal }, duration)
            .onStart(() => {
                this.setImageColorAlpha(image, startVal);
            })
            .onUpdate((obj) => {
                this.setImageColorAlpha(image, obj.x);
            })
            .onComplete(() => {
                onComplete();
            })
            .delay(delay)
            .easing(TWEEN.Easing.Linear.None)
            .start();
    }

    private setImageColorAlpha(image : Image, alpha : number) {
        var currColor = image.mainPass.baseColor;
        image.mainPass.baseColor = new vec4(
            currColor.r,
            currColor.g,
            currColor.b,
            alpha
        );
    }

}
