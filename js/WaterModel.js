'use strict';

/* Water model inherits from DataModel */

function WaterModel(xs, ys, fixedGeometryWidth, modelSet) {
    var waterModel = this;

    DataModel.call(this, xs, ys, fixedGeometryWidth, modelSet);

    this.init({ 
        elevation: 0,
        volume: 0
    });

    this.isAnimated = true;
    this.elevationSampled = false;

    this.patchHeights = new ABM.DataSet();

    ABM.Model.prototype.setup = function() {
        this.agentBreeds('droplets');

        var numDroplets = 100;
        this.droplets.create(numDroplets, function(droplet) {
            var newPos = this.patches.randomPt();
            droplet.setXY(newPos[0], newPos[1]);
            if (typeof droplet.p == 'undefined') {
                console.log('UNDEFINED', droplet);
            }
        }.bind(this));
    }

    ABM.Model.prototype.step = function() {
        this.droplets.forEach(function(droplet) {
            // var sampleCoord = this.patches.patchXYtoPixelXY(droplet.x, droplet.y);
            var aspect = waterModel.patchHeightsAspect.patchSample(droplet.x, droplet.y);
            droplet.heading = aspect;
            droplet.forward(1);
            if (typeof droplet.p == 'undefined') {
                console.log('UNDEFINED', droplet);
                throw new Error();
            }
        }.bind(this));
    }

    this.dropletModel = new ABM.Model({
        size: 1,
        minX: 0,
        maxX: xs-1,
        minY: 0,
        maxY: ys-1,
        hasNeighbors: false
    });

    this.reset();
}

WaterModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    start: function() {
        DataModel.prototype.start.call(this);
        this.dropletModel.start();
    },
    
    stop: function() {
        DataModel.prototype.stop.call(this);
        this.dropletModel.stop();
    },

    reset: function() {
        this.putData(0, 0, this.xSize, this.ySize, { volume: 0 });
        this.putData(60, 20, 10, 10, { volume: 50 });
        this.putData(100, 60, 10, 10, { volume: 50 });
    },

    sampleElevationXY: function(sampler, x,y) {
        var offset = function(p) { 
            return p * this.sampleSpacing + Math.floor(this.sampleSpacing/2);
        }.bind(this);

        return sampler.sample(offset(x), offset(y));
    },

    sampleElevation: function(sampler) {
        if (this.elevationSampled)
            return;

        this.patchHeights.reset(this.xSize, this.ySize, new Array(this.xSize*this.ySize));

        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var curPatch = this.world[i][j];
                curPatch.elevation = this.sampleElevationXY(sampler, i,j);
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

                if (transferVolume > patch.volume)
                    transferVolume = patch.volume;

                patch.volume -= transferVolume;
                minNeighbor.volume += transferVolume;

                if (transferVolume != 0) {
                    // update patchHeights
                    this.patchHeights.setXY(patch.x, patch.y, patch.elevation+patch.volume);
                    this.patchHeights.setXY(minNeighbor.x, minNeighbor.y, minNeighbor.elevation+minNeighbor.volume);

                    this.updateSlopeAndAspect(patch.x, patch.y);
                    this.updateSlopeAndAspect(minNeighbor.x, minNeighbor.y);
                }

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
            subset = this.patchHeights.subset(subsetX, subsetY, subsetSize, subsetSize),
            subsetStartX = (x-2*kernelRadius < 0) ? 0 : 1,
            subsetStartY = (y-2*kernelRadius < 0) ? 0 : 1;

        var subsetSlopeAndAspect = subset.slopeAndAspect(),
            subsetSlope = subsetSlopeAndAspect.slope,
            subsetAspect = subsetSlopeAndAspect.aspect;

        var iiStart = clamp(x-kernelRadius, 0, this.xSize-1),
            iiEnd = clamp(x+kernelRadius, 0, this.xSize-1),
            jjStart = clamp(y-kernelRadius, 0, this.ySize-1),
            jjEnd = clamp(y+kernelRadius, 0, this.ySize-1);

        for (var ii = iiStart, iiSubset = subsetStartX; ii <= iiEnd; ++ii, ++iiSubset) {
            for (var jj = jjStart, jjSubset = subsetStartY; jj <= jjEnd; ++jj, ++jjSubset) {
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

var WaterPatchRenderer = function() {
    var colorMap = _.map(_.range(0,21), function(num) {
        return 'rgba(40,105,186,{0})'.format(num/20);
    });

    function getColor(volume) {
        var idx = Math.floor(volume*2);
        if (idx > 19)
            idx = 19;
        return colorMap[idx];
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.volume > 0) {
            ctx.fillStyle = getColor(patch.volume);
            ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
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
}();
