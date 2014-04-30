
import {BaseModel} from 'js/BaseModel';
import {PatchRenderer} from 'js/PatchRenderer';

export class GenericModel extends BaseModel {
    constructor (xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);

        this.isAnimated = false;
        this.editable = false;
        this.canPaint = false;
    }

    setWorld(data) {
        this.world = data;
    }
}

export class GenericPatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;
        this.scaleValues = [];
    }

    color() { return 'red'; }
}
