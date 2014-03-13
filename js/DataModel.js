'use strict';

function DataModel() {
    this.world = null;
    this.callbacks = [];
    this.isAnimated = false;
    this.isRunning = false;
    this.hasControls = false;
    this.timeoutValue = 100;

    /* TODO -- this is iffy ... the distinction between whether 
     * there is an "Edit" button and whether you can manually paint */

    this.editable = true;
    this.canPaint = true;
}

DataModel.prototype = {
    init: function(xs, ys, fixedGeometryWidth, modelSet) {
        this.xSize = xs;
        this.ySize = ys;
        this.sampleSpacing = fixedGeometryWidth / xs;
        this.modelSet = modelSet;

        var world = new Array(this.xSize);

        for (var i = 0; i < this.xSize; ++i) {
            world[i] = new Array(this.ySize);
            for (var j = 0; j < this.ySize; ++j) {
                world[i][j] = { x: i, y: j };

                // TODO: this is usually redundant with DataModel.reset()
                // below, but necessary for the water model, which overrides
                // the reset() function.
                _.extend(world[i][j], this.defaultValue);
            }
        }        

        this.world = world;
        this.reset();
    },

    reset: function(defaultValue) {
        this.putData(0, 0, this.xSize, this.ySize, defaultValue || this.defaultValue, true);
    },

    putData: function(x, y, width, height, data, erase) {
        if (x < 0) 
            x = 0;
        if (x + width > this.xSize)
            width = this.xSize - x;

        if (y < 0)
            y = 0;
        if (y + height > this.ySize)
            height = this.ySize - y;

        this.modelSet.safeApply(function() {
            for (var i = x; i < x + width; ++i) {
                for (var j = y; j < y + height; ++j) {
                    if (erase) {
                        this.world[i][j] = { x: i, y: j };
                    }
                    _.extend(this.world[i][j], data);
                }
            }
        }.bind(this));
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

    // TODO: move show and hide to a DataModel interface object?
    show: function(key) {
        this.hide();
        if (typeof key != 'undefined') {
            this.curControl = key;
        }
        if (this.curControl) {
            this.controls[this.curControl].show();
        }
    },

    hide: function() {
        if (this.curControl) {
            this.controls[this.curControl].hide();
        }
    },

    run: function() {
        var $this = this;

        if (! this.isRunning)
            return;

        $this.modelSet.safeApply(function() {
            $this.step();
        });

        this.runCallbacks();

        setTimeout(function() { 
            $this.run(); 
        }, this.timeoutValue);
    },

    runCallbacks: function() {
        var $this = this;

        $this.modelSet.safeApply(function() {
            _.each($this.callbacks, function(cb) {
                setTimeout(function() {
                    cb($this.world);
                }, 0);
            });
        });
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
