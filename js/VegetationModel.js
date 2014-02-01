'use strict';

function VegetationModel(xs, ys, fixedGeometryWidth) {
    DataModel.call(this, xs, ys);
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

var VegetationPatchRenderer = function() {
    var t = VegetationModel.vegTypes;

    var colors = {};
    colors[t.FIR] = 'rgba(50,99,32,0.9)';
    colors[t.WOODLAND] = 'rgba(102,133,82,0.9)';
    colors[t.SAGEBRUSH] = 'rgba(55, 105, 93, 0.9)';
    colors[t.PRAIRIE] = 'rgba(130, 115, 83, 0.9)';
    colors[t.STEPPE] = 'rgba(214, 173, 84, 0.9)';
    colors[t.GRASS] = 'rgba(59, 153, 54, 0.9)';

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.vegetation === t.NONE)
            return;

        ctx.fillStyle = colors[patch.vegetation];
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    }

    var scale = [
        { value: { vegetation: t.FIR }, color: colors[t.FIR], name: 'Fir' },
        { value: { vegetation: t.WOODLAND }, color: colors[t.WOODLAND], name: 'Woodland' },
        { value: { vegetation: t.SAGEBRUSH }, color: colors[t.SAGEBRUSH], name: 'Sagebrush' },
        { value: { vegetation: t.PRAIRIE }, color: colors[t.PRAIRIE], name: 'Prairie' },
        { value: { vegetation: t.STEPPE }, color: colors[t.STEPPE], name: 'Steppe' },
        { value: { vegetation: t.GRASS }, color: colors[t.GRASS], name: 'Grass' }
    ];

    return { 
        render: render,
        scale: scale
    };
}();
