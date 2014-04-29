
import {BaseModel} from 'js/BaseModel';

/* Fire severity model inherits from DataModel */

export class FireSeverityModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);
        this.init({ severity: FireSeverityModel.severityTypes.NONE });
    }
}

FireSeverityModel.severityTypes = {
    LOW: 1, MEDIUM: 2, HIGH: 3, NONE: 0
};

FireSeverityModel.typeToString = function(type) {
    var t = FireSeverityModel.severityTypes;
    switch (type) {
    case t.LOW    : return 'Low';
    case t.MEDIUM : return 'Medium';
    case t.HIGH   : return 'High';
    case t.NONE   :
    default       : return 'No Data';
    }
};

/* Renderer for a single fire severity patch */

export var FirePatchRenderer = function(model) {
    var colorHigh = 'rgb(105,82,58)';
    var colorMedium = 'rgb(173,147,118)';
    var colorLow = 'rgb(240,217,192)';
    var colorNone = 'rgb(255,255,255)';

    var t = FireSeverityModel.severityTypes;

    function getColor(severity) {
        switch (severity) {
        case t.HIGH:
            return colorHigh;
        case t.MEDIUM:
            return colorMedium;
        case t.LOW:
            return colorLow;
        default:
            return colorNone;
        }
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.severity === FireSeverityModel.severityTypes.NONE)
            return;

        ctx.fillStyle = getColor(patch.severity);
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
    }

    var scale = _.map(_.values(t), function(severity) {
        return {
            value: { severity: severity },
            color: getColor(severity),
            name: FireSeverityModel.typeToString(severity)
        };
    });

    return {
        render: render,
        scale: scale
    };
};
