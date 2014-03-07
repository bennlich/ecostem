'use strict';

function VegetationModel(xs, ys, fixedGeometryWidth, modelSet) {
    DataModel.call(this, xs, ys, fixedGeometryWidth, modelSet);
    this.reset();

    var t = VegetationModel.vegTypes;

    this.controls = {};

    this.controls[t.FIR] = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Fir Density at Elevation');
    this.controls[t.FIR].controlPoints = [[2214,0], [2442,15], [2728,1], [4000,0]];

    this.controls[t.SAGEBRUSH] = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Sagebrush Density at Elevation');
    this.controls[t.SAGEBRUSH].controlPoints = [[1842,0], [1985,47.5], [2100,0], [4000,0]];

    this.controls[t.STEPPE] = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Steppe Density at Elevation');
    this.controls[t.STEPPE].controlPoints = [[0,0], [2657,0], [2871,26], [3042,0]];

    this.controls[t.GRASS] = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Grass Density at Elevation');
    this.controls[t.GRASS].controlPoints = [[0,0], [2114,0], [2199,18], [2330,0]];

    for (var x in this.controls) { 
        this.controls[x].render();
    }

    this.curControl = t.FIR;
}

VegetationModel.vegTypes = {
    NONE: 0, FIR: 1, SAGEBRUSH: 2, STEPPE: 3, GRASS: 4
};

VegetationModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this.init({ vegetation: VegetationModel.vegTypes.NONE });
    },

    scaleChanged: function(scale) {
        this.show(scale.value.vegetation);
    }
});

var VegetationPatchRenderer = function(model) {
    var t = VegetationModel.vegTypes;

    var colors = {};
    colors[t.FIR] = 'rgb(50,99,32)';
    colors[t.SAGEBRUSH] = 'rgb(55, 105, 93)';
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
        { value: { vegetation: t.SAGEBRUSH }, color: colors[t.SAGEBRUSH], name: 'Sagebrush' },
        { value: { vegetation: t.STEPPE }, color: colors[t.STEPPE], name: 'Steppe' },
        { value: { vegetation: t.GRASS }, color: colors[t.GRASS], name: 'Grass' },
        { value: { vegetation: t.NONE }, color: colors[t.NONE], name: 'None (Erase)' }
    ];

    return { 
        render: render,
        scale: scale
    };
};
