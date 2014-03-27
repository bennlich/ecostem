'use strict';

function GenericModel(xs, ys, bbox, modelSet) {
    DataModel.call(this, xs, ys, bbox, modelSet);

    this.isAnimated = false;
    this.editable = false;
    this.canPaint = false;
}

GenericModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    setWorld: function(data) {
        this.world = data;
    }
});

var GenericPatchRenderer = function(model) {
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
