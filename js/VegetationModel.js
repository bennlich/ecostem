'use strict';

function VegetationModel(xs, ys, fixedGeometryWidth) {
    DataModel.call(this, xs, ys, fixedGeometryWidth);
    this.reset();
}

VegetationModel.vegTypes = {
    NONE: 0, FIR: 1, WOODLAND: 2, SAGEBRUSH: 3, PRAIRIE: 4, STEPPE: 5, GRASS: 6
};

VegetationModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this.init({ vegetation: VegetationModel.vegTypes.NONE });
    }
});

var VegetationPatchRenderer = function(model) {
    var t = VegetationModel.vegTypes;

    var colors = {};
    colors[t.FIR] = 'rgb(50,99,32)';
    colors[t.WOODLAND] = 'rgb(102,133,82)';
    colors[t.SAGEBRUSH] = 'rgb(55, 105, 93)';
    colors[t.PRAIRIE] = 'rgb(130, 115, 83)';
    colors[t.STEPPE] = 'rgb(214, 173, 84)';
    colors[t.GRASS] = 'rgb(59, 153, 54)';
    colors[t.NONE] = 'rgb(255,255,255)';

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.vegetation === t.NONE)
            return;

        ctx.fillStyle = colors[patch.vegetation];
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
    }

    var scale = [
        { value: { vegetation: t.FIR }, color: colors[t.FIR], name: 'Fir' },
        { value: { vegetation: t.WOODLAND }, color: colors[t.WOODLAND], name: 'Woodland' },
        { value: { vegetation: t.SAGEBRUSH }, color: colors[t.SAGEBRUSH], name: 'Sagebrush' },
        { value: { vegetation: t.PRAIRIE }, color: colors[t.PRAIRIE], name: 'Prairie' },
        { value: { vegetation: t.STEPPE }, color: colors[t.STEPPE], name: 'Steppe' },
        { value: { vegetation: t.GRASS }, color: colors[t.GRASS], name: 'Grass' },
        { value: { vegetation: t.NONE }, color: colors[t.NONE], name: 'None (Erase)' }
    ];

    return { 
        render: render,
        scale: scale
    };
};
