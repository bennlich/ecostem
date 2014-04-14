'use strict';

function ScanElevationModel(xs, ys, bbox, modelSet) {
    DataModel.call(this, xs, ys, bbox, modelSet);
    DataModel.prototype.init.call(this, {elevation:0});

    this.isAnimated = false;
    this.editable = false;
    this.canPaint = false;

    this.min = 0;
    this.max = 0;
}

ScanElevationModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    load: function(anySurfaceDiff) {
        var yValues = anySurfaceDiff[1];

        var min = 10000000, max = -10000000;

        for (var x = 0; x < this.xSize; ++x) {
            for (var y = 0; y < this.ySize; ++y) {
                var yVal = yValues[y * this.xSize + x];
                if (yVal < min)
                    min = yVal;

                if (yVal > max)
                    max = yVal;
            }
        }

        var padding = min < 0 ? -min : 0;

        this.min = min + padding;
        this.max = max + padding;

        var chopThreshold = (this.max - this.min) * 0.4;

        for (var x = 0; x < this.xSize; ++x) {
            for (var y = 0; y < this.ySize; ++y) {
                var val = yValues[y * this.xSize + x] + padding;

                if (val < this.min + chopThreshold)
                    val = this.min + chopThreshold;

                if (val > this.max - chopThreshold)
                    val = this.max - chopThreshold;

                this.world[x][y].elevation = val;
            }
        }

        this.min = this.min + chopThreshold;
        this.max = this.max - chopThreshold;

    }
});
