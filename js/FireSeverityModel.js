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

    putData: function(x, y, width, height, value) {
        this._putData(x, y, width, height, value);
    }
});

/* Renderer for a single fire severity patch */

var FirePatchRenderer = function() {
    /* TODO: this will end up being generalized for UI access 
     * like drawing brushes in these colors */

    var colorHigh = 'rgba(105,82,58,0.9)';
    var colorMedium = 'rgba(173,147,118,0.9)';
    var colorLow = 'rgba(240,217,192,0.9)';

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
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    }

    
    var scale = [
        { value: { severity: t.LOW }, color: colorLow, name: 'Low Severity' },
        { value: { severity: t.MEDIUM }, color: colorMedium, name: 'Medium Severity' },
        { value: { severity: t.HIGH }, color: colorHigh, name: 'High Severity' }
    ];

    return { 
        render: render,
        scale: scale
    };
}();
