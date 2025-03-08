// code from
// https://localjoost.github.io/Lens-Studio-Cube-Bouncer-for-the-confused-Unity-developer-add-a-hand-menu/

import { HandInputData } from "SpectaclesInteractionKit/Providers/HandInputData/HandInputData";
import { HandType } from "SpectaclesInteractionKit/Providers/HandInputData/HandType";
import TrackedHand from "SpectaclesInteractionKit/Providers/HandInputData/TrackedHand"
import WorldCameraFinderProvider from "SpectaclesInteractionKit/Providers/CameraProvider/WorldCameraFinderProvider"
import { findPlace } from "Script/findPlace_toTS";


@component
export class HandFollower extends BaseScriptComponent {
    @input private handFollowObject: SceneObject;
    @input private distanceToHand: number = 5

    @input('Component.ScriptComponent')
    refScript: findPlace;

    private handProvider: HandInputData = HandInputData.getInstance()
    private leftHand = this.handProvider.getHand("left" as HandType);
    private rightHand = this.handProvider.getHand("right" as HandType);
    private camera = WorldCameraFinderProvider.getInstance();
    private noTrackCount = 0;

    onAwake() {
        this.createEvent("UpdateEvent").bind(() => {
            this.update();
        })
        this.handFollowObject.enabled = true;
        
    }

    update() {
        //print(this.refScript.navigating);
        if (this.tryShowHandMenu(this.rightHand)) 
        {
            //print("see hand");
            if(this.refScript.navigating){
                this.handFollowObject.enabled = true;
                //print(this.rightHand.middleToWrist.position);
                this.handFollowObject.getTransform().setWorldPosition(this.rightHand.middleToWrist.position);
                this.handFollowObject.getTransform().setWorldRotation(this.rightHand.middleToWrist.rotation);
                this.noTrackCount = 0;
            }
            
        }
        else
        {
            this.handFollowObject.enabled = false;
            this.noTrackCount++;
            if(this.noTrackCount > 0)
            {
                this.handFollowObject.enabled = false;
            }
        }
    }

    private tryShowHandMenu(hand: TrackedHand): boolean {
        if(!hand.isTracked() )
        {
            return false;
        }
        const currentPosition = hand.pinkyKnuckle.position;
        if(currentPosition != null) {
            
            const knuckleForward = hand.indexKnuckle.forward;
            const cameraForward = this.camera.getTransform().forward;
            const angle = Math.acos(knuckleForward.dot(cameraForward) / 
              (knuckleForward.length * cameraForward.length)) *  180.0 / Math.PI;
            if(Math.abs(angle) > 40)
            {
                return false;
            }
            // var directionNextToKnuckle = hand.handType == "left" ? 
            //        hand.indexKnuckle.right : 
            //        hand.indexKnuckle.right.mult(VectorUtils.scalar3(-1));
            
            // this.handFollowObject.getTransform().setWorldRotation(
            //     hand.indexKnuckle.rotation);
            // this.handFollowObject.getTransform().setWorldPosition(
            //     currentPosition.add(directionNextToKnuckle.mult(
            //     VectorUtils.scalar3(this.distanceToHand))));
            return true;
        }
        return false;
    }
}
