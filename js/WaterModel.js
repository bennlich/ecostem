'use strict';

var WaterModel = function() {
    var world = null;
    var xSize = 0;
    var ySize = 0;
    var sampleSpacing = 1;
    var elevationSampler = null;

    function getDims() {
        return [xSize, ySize];
    }

    function initialize(xs, ys, sampler) {
        xSize = xs;
        ySize = ys;
        elevationSampler = sampler;
        sampleSpacing = Math.floor(sampler.width / xSize);

        world = new Array(xSize);
        for (var i = 0; i < xSize; ++i) {
            world[i] = new Array(ySize);
            for (var j = 0; j < ySize; ++j) {
                world[i][j] = { 
                    volume: 0,
                    elevation: sample(i, j)
                };
            }
        }

        for (i = 60; i < 70; ++i) {
            for (j = 20; j < 30; ++j) {
                world[i][j].volume = 50;
            }
        }
        for (i = 100; i < 110; ++i) {
            for (j = 60; j < 70; ++j) {
                world[i][j].volume = 50;
            }
        }
    }

    function neighbors(x,y) {
        var n = [];
        for (var i = x-1; i <= x+1; ++i) {
            for (var j = y-1; j <= y+1; ++j) {
                if (!(i === x && j === y) && i >= 0 && j >= 0 && i < xSize && j < ySize) {
                    n.push(world[i][j]);
                }
            }
        }
        return n;
    }

    function sample(x,y) {
        function offset(p) { 
            return p * sampleSpacing + Math.floor(sampleSpacing/2);
        }
        return elevationSampler.sample(offset(x), offset(y));
    }

    function getWorld() {
        return world;
    }

    function step() {
        for (var i = 0; i < xSize; ++i) {
            for (var j = 0; j < ySize; ++j) {
                var patch = world[i][j];

                if (patch.volume === 0)
                    continue;

                var minNeighbor = _.min(neighbors(i,j), function(neighbor) {
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
    }

    var started = false;
    var steps = 0;
    var callbacks = [];

    function run() {
        if (started) {
            step();
            steps++;
            _.each(callbacks, function(callback) {
                setTimeout(function() { callback(world); }, 0);
            });
            setTimeout(run, 100);
        }
    }

    function start() {
        console.log('start');
        steps = 0;
        started = true;
        run();
    }

    function stop() {
        console.log('stop');
        //clearCallbacks();
        started = false;
    }

    function onChange(cb) {
        callbacks.push(cb);
    }

    function clearCallbacks() {
        callbacks = [];
        console.log('clear');
    }

    function getCallbacks() {
        return callbacks;
    }

    return {
        getWorld: getWorld,
        start: start,
        stop: stop,
        onChange: onChange,
        neighbors: neighbors,
        initialize: initialize,
        getDims: getDims,
        clearCallbacks: clearCallbacks,
        getCallbacks: getCallbacks
    };
}();
