'use strict';

function DataModel(xs, ys, fixedGeometryWidth, modelSet) {
    this.xSize = xs;
    this.ySize = ys;
    this.sampleSpacing = fixedGeometryWidth / xs;
    this.modelSet = modelSet;
    this.world = null;
    this.callbacks = [];
    this.isAnimated = false;
    this.isRunning = false;
    this.timeoutValue = 100;
    this.editable = true;
}

DataModel.prototype = {
    init: function(defaultValue) {
        var world = new Array(this.xSize);

        for (var i = 0; i < this.xSize; ++i) {
            world[i] = new Array(this.ySize);
            for (var j = 0; j < this.ySize; ++j) {
                world[i][j] = { x: i, y: j };
                /* make sure we make a copy of the default value */
                _.extend(world[i][j], defaultValue);
            }
        }        

        this.world = world;
    },

    putData: function(x,y,width,height,obj) {
        if (x < 0) 
            x = 0;
        if (x + width > this.xSize)
            width = this.xSize - x;

        if (y < 0)
            y = 0;
        if (y + height > this.ySize)
            height = this.ySize - y;

        for (var i = x; i < x + width; ++i) {
            for (var j = y; j < y + height; ++j) {
                for (var key in obj) {
                    this.world[i][j][key] = obj[key];
                }
            }
        }
    },

    neighbors: function(x,y) {
        var n = [];

        for (var i = x-1; i <= x+1; ++i) {
            for (var j = y-1; j <= y+1; ++j) {
                if (!(i === x && j === y) && i >= 0 && j >= 0 && i < this.xSize && j < this.ySize) {
                    n.push(this.world[i][j]);
                }
            }
        }

        return n;
    },

    step: function() { },

    show: function() { },

    hide: function() { },

    run: function() {
        var $this = this;

        if (! this.isRunning)
            return;

        this.step();

        _.each(this.callbacks, function(cb) {
            setTimeout(function() {
                cb($this.world);
            }, 0);
        });

        setTimeout(function() { 
            $this.run(); 
        }, this.timeoutValue);
    },

    start: function() {
        this.isRunning = true;
        this.run();
    },

    stop: function() {
        this.isRunning = false;
    },

    onChange: function(cb) {
        if (typeof cb === 'function') {
            this.callbacks.push(cb);
        }
    },

    clearCallbacks: function() {
        this.callbacks = [];
    }
};
