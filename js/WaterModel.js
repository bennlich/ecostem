'use strict';

/* Water model inherits from DataModel */

function WaterModel(xs, ys, fixedGeometryWidth) {
    DataModel.call(this, xs, ys);

    this.sampleSpacing = Math.floor(fixedGeometryWidth / xs);

    this.init({ 
        elevation: 0,
        volume: 0
    });

    this.reset();
}

WaterModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this._putData(0, 0, this.xSize, this.ySize, { volume: 0 });
        this._putData(60, 20, 10, 10, { volume: 50 });
        this._putData(100, 60, 10, 10, { volume: 50 });
    },

    sampleElevationXY: function(sampler, x,y) {
        var offset = function(p) { 
            return p * this.sampleSpacing + Math.floor(this.sampleSpacing/2);
        }.bind(this);

        return sampler.sample(offset(x), offset(y));
    },

    sampleElevation: function(sampler) {
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                this.world[i][j].elevation = this.sampleElevationXY(sampler, i,j);
            }
        }
    },

    step: function() {
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = this.world[i][j];

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
            }
        }
    },

    putData: function(x, y, width, height) {
        this._putData(x, y, width, height, {volume: 50});
    }
});

var WaterPatchRenderer = function() {
    var colorMap = _.map(_.range(0,21), function(num) {
        return 'rgba(40,105,186,{0})'.format(num/20);
    });

    function getColor(volume) {
        var idx = Math.floor(volume * 3);
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

    return { render: render };
}();
