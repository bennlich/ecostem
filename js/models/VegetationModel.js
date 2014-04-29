
import {BaseModel} from 'js/BaseModel';

export class VegetationModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);
        this.init({ vegetation: VegetationModel.vegTypes.NONE });
    }
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

export var VegetationPatchRenderer = function(model) {
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
