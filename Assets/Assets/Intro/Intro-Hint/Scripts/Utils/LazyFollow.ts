
@component
export class LazyFollow extends BaseScriptComponent {

    // region Inspector fields
    @input
    targetObject : SceneObject;

    @input
    followSpeed : number = 5.0;

    @input
    localOffset : vec3 = new vec3(0, 0, 0);

    @input
    worldOffset : vec3 = new vec3(0, 0, 0);

    @input
    freezeYAxis : boolean = false;

    @input
    @showIf('freezeY', true)
    freezeYAxisValue : number = 0;

    // endregion Inspector fields

    private followerObject: SceneObject;

    /**
     * Set the world offset.
     * @param offset - The new world offset.
     */
    public setWorldOffset(offset: vec3): void {
        this.worldOffset = offset;
    }

    /**
     * Set the local offset.
     * @param offset - The new local offset.
     */
    public setLocalOffset(offset: vec3): void {
        this.localOffset = offset;
    }

    public setFreezeYAxis(freezeY: boolean): void {
        this.freezeYAxis = freezeY;
    }

    public setYFreezeValue(yFreezeValue: number): void {
        this.freezeYAxisValue = yFreezeValue;
    }

    onAwake() {
        this.createEvent("OnStartEvent").bind(() => {
            this.onStart();
        });

        this.createEvent("UpdateEvent").bind(() => {
            this.onUpdate();
        });

        this.followerObject = this.getSceneObject();
    }

    private onStart() {

    }

    private onUpdate() {
        const xOffset = this.targetObject.getTransform().forward.uniformScale(this.localOffset.z);
        const yOffset = this.targetObject.getTransform().up.uniformScale(this.localOffset.y);
        const zOffset = this.targetObject.getTransform().right.uniformScale(this.localOffset.x);

        const totalOffset = xOffset.add(yOffset).add(zOffset).add(this.worldOffset);

        const targetPosition = this.targetObject.getTransform().getWorldPosition().add(totalOffset);
        const currentPosition = this.followerObject.getTransform().getWorldPosition();

        // Calculate the new position
        let newPosition = vec3.lerp(currentPosition, targetPosition, MathUtils.clamp(this.followSpeed * getDeltaTime(), 0, 1));

        if(this.freezeYAxis) {
            newPosition.y = this.freezeYAxisValue;
        }

        // Set the new position
        this.followerObject.getTransform().setWorldPosition(newPosition);
    }
}