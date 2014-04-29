
import {BaseModel} from 'js/BaseModel';

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

export var GenericPatchRenderer = function(model) {
    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        ctx.fillStyle = 'red';
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
    }

    return {
        render: render,
        scale: []
    };
};
