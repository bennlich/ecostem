var WaterPatchesModel = function() {
    var DataSet = ABM.DataSet;
    var Util = ABM.util;

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

        var volumePerCell = 20;
        var totalVolume = volumePerCell * this.patches.maxX * this.patches.maxY;

        this.patches.own('volume elevation capacity');
        this.patches.setDefault('volume', volumePerCell);
        this.patches.setDefault('capacity', 0);
        this.patches.setDefault('color', [100,100,150,0.01]);
        this.elevation.toPatchVar('elevation');

        _.each(this.patches, function(patch) {
            patch.elevation = Math.floor(patch.elevation);
            //console.log(patch.elevation);
        });
        var sortedByElevation = _.sortBy(this.patches, function(patch) {
            return patch.elevation;
        });
        var threshold = sortedByElevation[0].elevation + 1;
        while (totalVolume > 0) {
            _.each(sortedByElevation, function(patch) {
                if (patch.elevation <= threshold && totalVolume > 0) {
                    patch.capacity += 1;
                    totalVolume -= 1;
                }
            });
            threshold += 1;
        }
    };

    ABM.Model.prototype.transferToNeighbor = function(fromPatch, toPatch, volume) {
        if (fromPatch.volume < volume) {
            toPatch.volume += fromPatch.volume;
            fromPatch.volume = 0;
        } else {
            fromPatch.volume -= volume;
            toPatch.volume += volume;
        }
    };

    ABM.Model.prototype.step = function() {
        var transferVolume = 20;
        var moved = 0;

        _.each(this.patches, function(patch) {
            var alpha = patch.capacity / 100;
            if (alpha > 1)
                alpha = 1;
            patch.color = [100,100,150,alpha];
        });

        // _.each(this.patches, function(patch) {
        //     if (patch.volume > 0) {
        //         var minNeighbor = _.min(patch.n, function(neighbor) {
        //             return neighbor.elevation;
        //         });

        //         if (minNeighbor.elevation < patch.elevation) 
        //         {
        //             if (minNeighbor.capacity == 0
        //                 || minNeighbor.volume + transferVolume <= minNeighbor.capacity)
        //             {
        //                 this.transferToNeighbor(patch, minNeighbor, transferVolume);
        //                 moved++;
        //             } else if (minNeighbor.volume < minNeighbor.capacity) {
        //                 transferVolume = minNeighbor.capacity - minNeighbor.volume;
        //                 this.transferToNeighbor(patch, minNeighbor, transferVolume);
        //                 moved++;
        //             }
        //         }
        //     }

        //     var alpha = patch.volume / 100;
        //     if (alpha > 1)
        //         alpha = 1;

        //     patch.color = [100,100,150,alpha];
        // }.bind(this));

        if (moved === 0) {
            this.stop();
        }
    };

    return ABM.Model;
}();
