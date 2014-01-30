'use strict';

var WaterModel = function() {
    var world = null;
    var xSize = 0;
    var ySize = 0;
    var sampleSpacing = 1;
    var elevationSampler = null;
    var idleRefreshRate = 500;
    var refreshRate = 100;

    function getDims() {
        return {
            xSize: xSize,
            ySize: ySize
        };
    }

    function initialize(xs, ys, sampler) {
        xSize = xs;
        ySize = ys;
        elevationSampler = sampler;
        sampleSpacing = Math.floor(sampler.fixedScenarioWidth / xSize);

        world = new Array(xSize);
        for (var i = 0; i < xSize; ++i) {
            world[i] = new Array(ySize);
            for (var j = 0; j < ySize; ++j) {
                world[i][j] = {
                    volume: 0,
                    elevation: 0
                };
            }
        }

        init();

        run();
    }

    function init() {
        putWater(60,20,10,10);
        putWater(100,60,10,10);
    }

    function reset() {
        for (var i = 0; i < xSize; ++i) {
            for (var j = 0; j < ySize; ++j) {
                world[i][j].volume = 0;
            }
        }

        init();
    }

    function putWater(x,y,width,height,amount) {
        if (typeof amount === 'undefined')
            amount = 50;

        if (x < 0) 
            x = 0;
        if (x + width > xSize)
            width = xSize - x;

        if (y < 0)
            y = 0;
        if (y + height > ySize)
            height = ySize - y;

        for (var i = x; i < x + width; ++i) {
            for (var j = y; j < y + height; ++j) {
                world[i][j].volume += amount;
            }
        }
    }

    function sampleElevation() {
        for (var i = 0; i < xSize; ++i) {
            for (var j = 0; j < ySize; ++j) {
                world[i][j].elevation = sample(i,j);
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
    var callbacks = [];

    function run() {
        if (started) {
            step();
        }
        _.each(callbacks, function(callback) {
            setTimeout(function() { callback(world); }, 0);
        });
        setTimeout(run, started ? refreshRate : idleRefreshRate);
    }

    function start() {
        console.log('start');
        started = true;
    }

    function stop() {
        console.log('stop');
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

    function isRunning() {
        return started;
    }

    return {
        getWorld: getWorld,
        sampleElevation: sampleElevation,
        start: start,
        stop: stop,
        onChange: onChange,
        neighbors: neighbors,
        initialize: initialize,
        getDims: getDims,
        clearCallbacks: clearCallbacks,
        getCallbacks: getCallbacks,
        isRunning : isRunning,
        putData : putWater,
        reset : reset
    };
}();

var WaterModelRenderer = function() {
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
