'use strict';

/* Water model inherits from DataModel */

function WaterModel(xs, ys, fixedGeometryWidth, modelSet) {
    DataModel.call(this, xs, ys, fixedGeometryWidth, modelSet);

    this.init({ 
        elevation: 0,
        volume: 0,
        siltFloating: 0,
        siltDeposit: 0
    });

    this.isAnimated = true;
    this.hasControls = true;
    this.elevationSampled = false;

    this.erosionModel = null;

    this.patchHeights = new ABM.DataSet();
    this.slopeToVelocity = new TransferFunction([0, 50], 'degrees', [0, 1], 'm / s', 'Flow velocity vs. slope');
    this.slopeToVelocity.controlPoints[0] = [0,0.4];
    this.slopeToVelocity.controlPoints[1] = [22,0.55];
    this.slopeToVelocity.render();
    this.reset();
}

WaterModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    _erosionModel: function() {
        if (!this.erosionModel && this.modelSet.models)
            this.erosionModel = this.modelSet.getDataModel('Erosion & Deposit');
        return this.erosionModel;
    },

    reset: function() {
        this.putData(0, 0, this.xSize, this.ySize, { volume: 0 });
        this.putData(60, 20, 10, 10, { volume: 50 });
        this.putData(100, 60, 10, 10, { volume: 50 });

        var erosionModel = this._erosionModel();

        if (erosionModel) {
            erosionModel.reset();
            erosionModel.runCallbacks();
        }
    },

    show: function() {
        this.slopeToVelocity.show();
    },

    hide: function() {
        this.slopeToVelocity.hide();
    },

    start: function() {
        /* call superclass */
        DataModel.prototype.start.call(this);
        this._erosionModel().start();
    },

    stop: function() {
        /* call superclass */
        DataModel.prototype.stop.call(this);
        this._erosionModel().stop();
    },

    sampleElevation: function() {
        if (this.elevationSampled)
            return;

        this.patchHeights.reset(this.xSize, this.ySize, new Array(this.xSize*this.ySize));

        var elevationModel = this.modelSet.getDataModel('Elevation');

        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var curPatch = this.world[i][j];
                curPatch.elevation = this.modelSet.sample(i, j, this, elevationModel).elevation;
                this.patchHeights.setXY(i,j, curPatch.elevation + curPatch.volume);
            }
        }

        var slopeAndAspect = this.patchHeights.slopeAndAspect();
        this.patchHeightsSlope = slopeAndAspect.slope;
        this.patchHeightsAspect = slopeAndAspect.aspect;

        this.elevationSampled = true;
    },

    step: function() {
        var fireSeverityModel = this.modelSet.getDataModel('Fire Severity');

        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = this.world[i][j];

                /* sampling live... so if you draw on the map while the model is running
                 * the model should respond.
                 */
                var sevValue = this.modelSet.sample(i, j, this, fireSeverityModel);

                if (patch.volume === 0)
                    continue;

                var minNeighbor = _.min(this.neighbors(i,j), function(neighbor) {
                    return neighbor.volume + neighbor.elevation;
                });

                var patchHeight = patch.volume + patch.elevation;
                var neighborHeight = minNeighbor.volume + minNeighbor.elevation;

                var transferVolumeBalancePoint = (neighborHeight + patchHeight) / 2;
                var transferVolume = patch.volume - (transferVolumeBalancePoint - patch.elevation);

                // TODO: Smarter velocity calculation
                var velocity = this.slopeToVelocity(Math.abs(patchHeight - neighborHeight)/2);
                transferVolume *= velocity;

                var erosionModel = this._erosionModel();
                var erosionValue = erosionModel.tf(velocity*100);

                if (erosionValue < 0) { /* erosion */
                    patch.siltFloating += -erosionValue;
                    patch.siltDeposit += erosionValue;
                }

                if (erosionValue > 0 && patch.siltFloating > 0) { /* deposit */
                    var value = erosionValue;

                    if (erosionValue > patch.siltFloating)
                        value = patch.siltFloating;

                    patch.siltFloating -= value;
                    patch.siltDeposit += value;
                }

                this._erosionModel().world[i][j].erosion = patch.siltDeposit;

                if (transferVolume > patch.volume)
                    transferVolume = patch.volume;

                patch.volume -= transferVolume;
                minNeighbor.volume += transferVolume;

                /* TODO transfer all the silt for now -- should probalby be a function
                 * of velocity -- ie transfer an amount proportional to the amount of 
                 * transfered water */
                minNeighbor.siltFloating = patch.siltFloating;
                patch.siltFloating = 0;

                /*
                if (transferVolume != 0) {
                    // update patchHeights
                    this.patchHeights.setXY(patch.x, patch.y, patch.elevation+patch.volume);
                    this.patchHeights.setXY(minNeighbor.x, minNeighbor.y, minNeighbor.elevation+minNeighbor.volume);

                    this.updateSlopeAndAspect(patch.x, patch.y);
                    this.updateSlopeAndAspect(minNeighbor.x, minNeighbor.y);
                }
                */
            }
        }
    },

    updateSlopeAndAspect: function(x, y) {
        // recalculate local slope and aspect around the current patch
        var kernelSize = 3,
            kernelRadius = Math.floor(kernelSize/2),
            subsetSize = kernelSize + 2*kernelRadius;
        
        var clamp = ABM.util.clamp;

        var subsetX = clamp(x-2*kernelRadius, 0, this.xSize-subsetSize),
            subsetY = clamp(y-2*kernelRadius, 0, this.ySize-subsetSize),
            subset = this.patchHeights.subset(subsetX, subsetY, subsetSize, subsetSize);

        var subsetSlopeAndAspect = subset.slopeAndAspect(),
            subsetSlope = subsetSlopeAndAspect.slope,
            subsetAspect = subsetSlopeAndAspect.aspect;

        var iiStart = clamp(x-kernelRadius, 0, this.xSize-1),
            iiEnd = clamp(x+kernelRadius, 0, this.xSize-1),
            jjStart = clamp(y-kernelRadius, 0, this.ySize-1),
            jjEnd = clamp(y+kernelRadius, 0, this.ySize-1);

        for (var ii = iiStart, iiSubset = 1; ii <= iiEnd; ++ii, ++iiSubset) {
            for (var jj = jjStart, jjSubset = 1; jj <= jjEnd; ++jj, ++jjSubset) {
                this.patchHeightsSlope.setXY(ii, jj, subsetSlope.getXY(iiSubset, jjSubset));
                this.patchHeightsAspect.setXY(ii, jj, subsetAspect.getXY(iiSubset, jjSubset));
            }
        }
    },

    getSlope: function() {
        return this.patchHeightsSlope;
    },

    calculateSlope: function() {
        return this.patchHeights.slopeAndAspect().slope;
    }
});

var WaterPatchRenderer = function(model) {
    var colorMap = Gradient.multiGradient(
        '#9cf', 
        [{color: '#137', steps: 15}, 
         {color: '#123', steps: 5}]
    );

    var maxVolume = 30;
    var step = colorMap.length / maxVolume;

    function getColor(volume) {
        var idx = Math.floor(volume * step);

        if (idx >= colorMap.length)
            idx = colorMap.length-1;

        return colorMap[idx];
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.volume > 0) {
            ctx.fillStyle = getColor(patch.volume);
            ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
        }
    }

    var scale = _.map([5, 10, 20, 30, 0], function(num) {
        var name = num;
        if (num === 0)
            name = 'None (Erase)';
        return { value: { volume: num }, color: getColor(num), name: name };
    });

    return { 
        render: render,
        scale: scale
    };
};
