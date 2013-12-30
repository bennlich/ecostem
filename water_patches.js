var WaterPatchesModel = function() {
    var DataSet = ABM.DataSet;
    var Util = ABM.util;
    var backgroundImgCtx = null;

    ABM.Model.prototype.startup = function() {
        this.elevation = DataSet.importAscDataSet("data/nldroplets.asc", function(ds) {
        //this.elevation = DataSet.importAscDataSet("data/elevation640x480.asc", function(ds) {
            var slopeAndAspect = ds.slopeAndAspect();
            this.slope = slopeAndAspect[0];
            this.aspect = slopeAndAspect[1];
        }.bind(this));
    };

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
        this.elevation.toPatchVar('elevation');

        this.patches.setDefault('waterHeight', function() {
            return this.volume + this.elevation;
        });

        /* draw the elevation map into the background canvas */
        var img = this.elevation.toImage();
        this.patches.installDrawing(img, backgroundImgCtx);

        this.dropWaterInRect(100,111,60,71,volumePerCell);
        this.dropWaterInRect(160,171,100,111,volumePerCell);
    };

    ABM.Model.prototype.drawPatch = function(patch) {
        var alpha = patch.volume/2;

        if (alpha > 1) 
            alpha = 1;

        patch.color = [100,100,150,alpha];
    };

    ABM.Model.prototype.step = function() {
        var waterPatches = _.filter(this.patches, function(patch) { 
            return patch.volume > 0; 
        });

        _.each(waterPatches, function(patch) {
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

    function initialize(asDiv, imgDiv, patchSize, xMin, xMax, yMin, yMax) {
        backgroundImgCtx = document.getElementById(imgDiv).getContext("2d");
        var model = new ABM.Model(asDiv, patchSize, xMin, xMax, yMin, yMax).start();
        return model;
    }

    return {
        initialize: initialize
    };
}();
