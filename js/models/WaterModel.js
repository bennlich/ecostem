'use strict';

import {extend} from 'js/Util';
import {BaseModel} from 'js/BaseModel';
import {FireSeverityModel} from 'js/models/FireSeverityModel';
import {TransferFunctions} from 'js/TransferFunctions';

/* Water model inherits from BaseModel */

export function WaterModel(xs, ys, bbox, modelSet) {
    BaseModel.call(this, xs, ys, bbox, modelSet);

    this.init({
        elevation: 0,
        volume: 0,
        siltFloating: 0,
        siltDeposit: 0
    });

    this.isAnimated = true;
    this.elevationSampled = false;

    this.erosionModel = null;
    this.burnSeverityModel = null;

    this.patchHeights = new ABM.DataSet();

    this.reset();
}

WaterModel.prototype = extend(BaseModel.prototype, {
    _erosionModel: function() {
        if (!this.erosionModel && this.modelSet.models)
            this.erosionModel = this.modelSet.getDataModel('Erosion & Deposit');
        return this.erosionModel;
    },

    _burnSeverityModel: function() {
        if (!this.burnSeverityModel && this.modelSet.models)
            this.burnSeverityModel = this.modelSet.getDataModel('Fire Severity');
        return this.burnSeverityModel;
    },

    reset: function() {
        this.putData(0, 0, this.xSize, this.ySize, {volume:0, siltFloating: 0, siltDeposit: 0});
        this.putData(60, 20, 10, 10, { volume: 50 });
        this.putData(100, 60, 10, 10, { volume: 50 });

        var erosionModel = this._erosionModel();

        if (erosionModel) {
            erosionModel.reset();
            erosionModel.runCallbacks();
        }
    },

    start: function() {
        /* call superclass */
        BaseModel.prototype.start.call(this);
        this._erosionModel().start();
    },

    stop: function() {
        /* call superclass */
        BaseModel.prototype.stop.call(this);
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
                curPatch.elevation = elevationModel.sample(this.modelSet.crs.modelCoordToCommonCoord({x:i, y:j}, this)).elevation;
                this.patchHeights.setXY(i,j, curPatch.elevation + curPatch.volume);
            }
        }

        var slopeAndAspect = this.patchHeights.slopeAndAspect();
        this.patchHeightsSlope = slopeAndAspect.slope;
        this.patchHeightsAspect = slopeAndAspect.aspect;

        this.elevationSampled = true;
    },

    step: function() {
        BaseModel.prototype.step.call(this);

        var fireSeverityModel = this.modelSet.getDataModel('Fire Severity');

        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = this.world[i][j];

                if (patch.volume === 0)
                    continue;

                // calculate evaporation and infiltration (what's left is runoff)
                var burnSeverityModel = this._burnSeverityModel(),
                    patchSeverity = FireSeverityModel.typeToString(burnSeverityModel.world[i][j].severity);

                var evapInfRunoff = TransferFunctions.evapInfRunoff(patchSeverity);

                //patch.volume = patch.volume * evapInfRunoff.Runoff;

                // the amount of water that flows is proportional to the difference in heights
                // between the current patch and its lowest neighbor
                var minNeighbor = _.min(this.neighbors(i,j), function(neighbor) {
                    return neighbor.volume + neighbor.elevation + neighbor.siltDeposit + neighbor.siltFloating;
                });

                var patchHeight = patch.volume + patch.elevation + patch.siltDeposit + patch.siltFloating;
                var neighborHeight = minNeighbor.volume + minNeighbor.elevation + minNeighbor.siltDeposit + minNeighbor.siltFloating;

                var transferVolumeBalancePoint = (neighborHeight + patchHeight) / 2;
                var transferVolume = patch.volume - (transferVolumeBalancePoint - patch.elevation);

                // TODO: Smarter velocity calculation
                var velocity = TransferFunctions.slopeToVelocity(Math.abs(patchHeight - neighborHeight)/2);
                transferVolume *= velocity/100;

                if (transferVolume > patch.volume)
                    transferVolume = patch.volume;

                patch.volume -= transferVolume;
                minNeighbor.volume += transferVolume;

                /* Code below deals with erosion and deposit -- silting */

                var erosionModel = this._erosionModel(),
                    /* soil height to be eroded */
                    erosionValue = TransferFunctions.velocityToErosion(velocity),
                    /* percentage of floating silt to be deposited */
                    depositValue = TransferFunctions.velocityToDeposit(velocity)/100;

                if (erosionValue < 0) {
                    throw new Error('neg erosion');
                }

                /* dislodge silt and make it float */
                patch.siltFloating += erosionValue;
                patch.siltDeposit -= erosionValue;

                if (patch.siltFloating > 0) {
                    var value = depositValue * patch.siltFloating;
                    if (value > patch.siltFloating) {
                        console.log(patch.siltFloating, value, depositValue);
                        throw new Error('shit');
                    }
                    patch.siltFloating -= value;
                    patch.siltDeposit += value;
                }

                this._erosionModel().world[i][j].erosion = patch.siltDeposit;

                if (patch.volume === 0) {
                    /* if we passed all the water to the neighbor,
                     * pass all the floating silt along with it.
                     */
                    minNeighbor.siltFloating += patch.siltFloating;
                    patch.siltFloating = 0;
                } else {
                    var siltTransfer = patch.siltFloating * velocity/100;
                    minNeighbor.siltFloating += siltTransfer;
                    patch.siltFloating -= siltTransfer;
                }

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

export var WaterPatchRenderer = function(model) {
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
            name = 'No Data';

        return {
            value: { volume: num },
            color: getColor(num),
            name: name
        };
    });

    return {
        render: render,
        scale: scale
    };
};
