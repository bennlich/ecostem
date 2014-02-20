'use strict';

/* Fire severity model inherits from DataModel */

function FireSeverityModel(xs, ys, fixedGeometryWidth) {
    DataModel.call(this, xs, ys, fixedGeometryWidth);
    this.reset();
}

FireSeverityModel.severityTypes = {
    NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3
};

FireSeverityModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this.init({ severity: FireSeverityModel.severityTypes.NONE });
    }
});

/* Renderer for a single fire severity patch */

var FirePatchRenderer = function() {
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
        default:
            return colorLow;
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

    var scale = [
        { value: { severity: t.LOW }, color: colorLow, name: 'Low Severity' },
        { value: { severity: t.MEDIUM }, color: colorMedium, name: 'Medium Severity' },
        { value: { severity: t.HIGH }, color: colorHigh, name: 'High Severity' },
        { value: { severity: t.NONE }, color: colorNone, name: 'None (Erase)' }
    ];

    return { 
        render: render,
        scale: scale
    };
}();
