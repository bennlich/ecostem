'use strict';

function ElevationModel(xs, ys, bbox, modelSet) {
    BaseModel.call(this, xs, ys, bbox, modelSet);
    BaseModel.prototype.init.call(this, {elevation:0});

    this.min = 1000000;
    this.max = 0;

    this.editable = false;
    this.canPaint = false;
}

ElevationModel.prototype = extend(BaseModel.prototype, {
    sampleElevationXY: function(sampler, x,y) {
        var sampleSpacing = sampler.samplingWidth / this.xSize;

        var offset = function(p) {
            return p * sampleSpacing + Math.floor(sampleSpacing/2);
        }.bind(this);

        return sampler.sample(offset(x), offset(y));
    },

    loadElevation: function(sampler) {
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var curPatch = this.world[i][j];
                var e = this.sampleElevationXY(sampler, i,j);

                if (e < this.min)
                    this.min = e;
                if (e > this.max)
                    this.max = e;

                curPatch.elevation = e;
            }
        }
    }
});

var ElevationPatchRenderer = function(model) {
    var colorMap = Gradient.multiGradient(
        '#123',
        [{color: '#505Fa5', steps: 40},
         {color: '#D66783', steps: 100},
         {color: '#fff', steps: 100}]
    );

    function getColor(elevation) {
        var range = model.max - model.min;
        var relativeElevation = elevation - model.min;
        var metersPerStep = range / colorMap.length;
        var idx = Math.floor(relativeElevation / metersPerStep);

        return colorMap[idx];
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        ctx.fillStyle = getColor(patch.elevation);
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
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
