define(function() {

    'use strict';

    /* Vegetation model inherits from DataModel */

    var VegetationModel = window.VegetationModel = function() {
        DataModel.call(this);

        var t = VegetationModel.vegTypes;

        this.defaultValue = {
            vegetation: t.NONE
        };

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
        FIR: 1, SAGEBRUSH: 2, STEPPE: 3, GRASS: 4, NONE: 0
    };

    VegetationModel.typeToString = function(type) {
        var t = VegetationModel.vegTypes;
        switch (type) {
        case t.FIR: return 'Fir';
        case t.SAGEBRUSH: return 'Sagebrush';
        case t.STEPPE: return 'Steppe';
        case t.GRASS: return 'Grass';
        case t.NONE:
        default: return 'No Data';
        }
    };

    VegetationModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
        scaleChanged: function(scale) {
            this.show(scale.value.vegetation);
        }
    });

    window.VegetationPatchRenderer = function(model) {
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

        var scale = _.map(_.values(t), function(vegType) {
            return {
                value: { vegetation: vegType },
                color: colors[vegType],
                name: VegetationModel.typeToString(vegType)
            };
        });

        return { 
            render: render,
            scale: scale
        };
    };

    return new VegetationModel();

});