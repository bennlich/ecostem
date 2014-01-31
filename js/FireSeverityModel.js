'use strict';

/* Fire severity model inherits from DataModel */

function FireSeverityModel(xs, ys, fixedGeometryWidth) {
    DataModel.call(this, xs, ys);
    this.reset();
}

FireSeverityModel.severityTypes = {
    NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3
};

FireSeverityModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this.init({ severity: FireSeverityModel.severityTypes.NONE });
    },

    putData: function(x, y, width, height) {
        this._putData(x, y, width, height, {severity: FireSeverityModel.severityTypes.MEDIUM});
    }
});

/* Renderer for a single fire severity patch */

var FirePatchRenderer = function() {
    /* TODO: this will end up being generalized for UI access 
     * like drawing brushes in these colors */

    var colorHigh = 'rgba(105,82,58,0.9)';
    var colorMedium = 'rgba(173,147,118,0.9)';
    var colorLow = 'rgba(240,217,192,0.9)';

    function getColor(severity) {
        switch (severity) {
        case FireSeverityModel.severityTypes.HIGH:
            return colorHigh;
        case FireSeverityModel.severityTypes.MEDIUM:
            return colorMedium;
        case FireSeverityModel.severityTypes.LOW:
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
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    }

    return { render: render };
}();
