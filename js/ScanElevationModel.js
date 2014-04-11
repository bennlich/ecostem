'use strict';

function ScanElevationModel(xs, ys, bbox, modelSet) {
    DataModel.call(this, xs, ys, bbox, modelSet);

    this.isAnimated = false;
    this.editable = false;
    this.canPaint = false;
}

ScanElevationModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    load: function(anySurfaceDiff) {

    }
});
