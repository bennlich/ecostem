var WaterPatchesModel = function() {
    var DataSet = ABM.DataSet;
    var Util = ABM.util;
    var backgroundImgCtx = null;

    ABM.Model.prototype.startup = function() {
        //this.elevation = DataSet.importAscDataSet("data/nldroplets.asc", function(ds) {
        this.elevation = DataSet.importAscDataSet("data/elevation640x480.asc", function(ds) {
            var slopeAndAspect = ds.slopeAndAspect();
            this.slope = slopeAndAspect[0];
            this.aspect = slopeAndAspect[1];
        }.bind(this));
    };

    ABM.Model.prototype.setup = function() {
        this.refreshPatches = true;
        this.refreshLinks = false;

        //this.anim.setRate();

        var volumePerCell = 20;

        this.patches.own('volume elevation');
        this.patches.setDefault('volume', volumePerCell);
        this.patches.setDefault('color', [100,100,150,0.01]);
        this.elevation.toPatchVar('elevation');

        /* draw the elevation map into the background canvas */
        var img = this.elevation.toImage();
        this.patches.installDrawing(img, backgroundImgCtx);

        _.each(this.patches, function(patch) {
            patch.elevation = Math.floor(patch.elevation);
        });
    };

    ABM.Model.prototype.step = function() {
        var moved = 0;

        _.each(this.patches, function(patch) {
            if (patch.volume > 0) {
                var minNeighbor = _.min(patch.n, function(neighbor) {
                    return neighbor.elevation + neighbor.volume;
                });

                var minNeighborVolume = minNeighbor.volume;

                if (minNeighbor !== patch) {
                    var transferVolumeBalancePoint = 
                            (minNeighbor.elevation + minNeighbor.volume
                             + patch.elevation + patch.volume) / 2;
                    var transferVolume = patch.volume - (transferVolumeBalancePoint - patch.elevation);
                    if (transferVolume > patch.volume)
                        transferVolume = patch.volume;
                    patch.volume -= transferVolume;
                    minNeighbor.volume += transferVolume;
                }

                var alpha = patch.volume / 100;
                if (alpha > 1)
                    alpha = 1;
                patch.color = [100,100,150,alpha];
                moved++;
            }
        });

        if (moved === 0) {
            this.stop();
        }
    };

    function initialize(asDiv, imgDiv, patchSize, xMin, xMax, yMin, yMax) {
        backgroundImgCtx = document.getElementById(imgDiv).getContext("2d");
        return new ABM.Model(asDiv, patchSize, xMin, xMax, yMin, yMax).debug().start();
    }

    return {
        initialize: initialize
    };
}();
