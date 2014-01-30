'use strict';

var severityTypes = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3
};

var FireSeverityModel = function() {
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
                    severity: severityTypes.NONE
                };
            }
        }

        init();

        run();
    }

    function init() {
        putFire(160,40,10,10);
        putFire(200,60,10,10);
    }

    function reset() {
        for (var i = 0; i < xSize; ++i) {
            for (var j = 0; j < ySize; ++j) {
                world[i][j].severity = severityTypes.LOW;
            }
        }

        init();
    }

    function putFire(x,y,width,height,type) {
        if (typeof type === 'undefined')
            type = severityTypes.MEDIUM;

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
                world[i][j].severity = type;
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

    var started = false;
    var callbacks = [];

    function run() {
        _.each(callbacks, function(callback) {
            setTimeout(function() { callback(world); }, 0);
        });
        setTimeout(run, idleRefreshRate);
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
        console.log('fire callbcaks');
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
        putData : putFire,
        reset : reset
    };
}();

var FireModelPatchRenderer = function() {
    function getColor(severity) {
        switch (severity) {
        case severityTypes.HIGH:
            return 'rgba(105,82,58,0.9)';
        case severityTypes.MEDIUM:
            return 'rgba(173,147,118,0.9)';
        case severityTypes.LOW:
        default:
            return 'rgba(240,217,192,0.9)';
        }
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.severity === severityTypes.NONE)
            return;

        ctx.fillStyle = getColor(patch.severity);
        ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    }

    return { render: render };
}();
