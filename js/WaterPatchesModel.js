var WaterPatchesModel = function() {
    var DataSet = ABM.DataSet;
    var elevationSampler = null;

    ABM.Model.prototype.startup = function() {};

    ABM.Model.prototype.dropWaterInRect = function(x1,x2,y1,y2,volumePerCell) {
        _.each(_.range(x1,x2), function(i) {
            _.each(_.range(y1,y2), function(j) {
                this.patches.patchXY(i,j).volume = volumePerCell;
            }.bind(this));
        }.bind(this));
    };

    ABM.Model.prototype.setup = function() {
        this.refreshPatches = true;
        this.refreshLinks = false;

        var volumePerCell = 50;

        this.patches.own('volume elevation waterHeight');
        this.patches.setDefault('volume', 0);
        this.patches.setDefault('color', [100,100,150,0.01]);
        this.patches.setDefault('waterHeight', function() {
            return this.volume + this.elevation;
        });

        /* Sample from the elevation image */
        _.each(this.patches, function(patch) {
            var xy = this.patches.patchXYtoPixelXY(patch.x, patch.y);
            patch.elevation = elevationSampler.sample(xy[0], xy[1]);
        }.bind(this));

        /* Drop some water on the map */
        this.dropWaterInRect(100,111,60,71,volumePerCell);
        this.dropWaterInRect(160,171,100,111,volumePerCell);

        /* Create a color array to use for drawing water patches. This
         * is presumably a lot faster than creating a new color each
         * time.
         */
        this.colorMap = _.map(_.range(0,10), function(num) {
            return [100,100,150,num/10];
        });
    };

    ABM.Model.prototype.drawPatch = function(patch) {
        var idx = Math.floor(patch.volume * 3);

        if (idx > 9)
            idx = 9;

        patch.color = this.colorMap[idx];
    };

    ABM.Model.prototype.step = function() {
        var waterPatches = _.filter(this.patches, function(patch) { 
            return patch.volume > 0; 
        });

        _.each(waterPatches, function(patch) {
            /* On each step, each cell tries to equalize its water
             * height with that of its min neighbor */

            var minNeighbor = _.min(patch.n, function(neighbor) {
                return neighbor.waterHeight();
            });

            var transferVolumeBalancePoint = (minNeighbor.waterHeight() + patch.waterHeight()) / 2;
            var transferVolume = patch.volume - (transferVolumeBalancePoint - patch.elevation);

            if (transferVolume > patch.volume)
                transferVolume = patch.volume;

            patch.volume -= transferVolume;
            minNeighbor.volume += transferVolume;

            this.drawPatch(patch);
        }.bind(this));
    };

    function initialize(asDiv, sampler, patchSize, xMin, xMax, yMin, yMax) {
        /* See ElevationSampler.js */
        elevationSampler = sampler;
        var model = new ABM.Model(asDiv, patchSize, xMin, xMax, yMin, yMax).debug().start();
        return model;
    }

    return {
        initialize: initialize
    };
}();
