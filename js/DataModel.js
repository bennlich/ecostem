'use strict';

function DataModel(xs, ys) {
    this.xSize = xs;
    this.ySize = ys;
    this.world = null;
    this.callbacks = [];
    this.callbacks2 = [];
    this.isAnimated = false;
    this.isRunning = false;
    this.refreshRates = {
        idle: 200,
        active: 80
    };
    this.run();
    this.run2();
}

DataModel.prototype = {
    init: function(defaultValue) {
        var world = new Array(this.xSize);

        for (var i = 0; i < this.xSize; ++i) {
            world[i] = new Array(this.ySize);
            for (var j = 0; j < this.ySize; ++j) {
                world[i][j] = {};
                /* make sure we make a copy of the default value */
                _.extend(world[i][j], defaultValue);
            }
        }        

        this.world = world;
    },

    putData: function(x,y,width,height,obj) {
        console.log('put data');
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

    run: function() {
        if (this.isRunning) {
            this.step();
        }

        var world = this.world;
        _.each(this.callbacks, function(cb) {
            setTimeout(function() {
                cb(world);
            }, 0);
        });

        var timeout = this.isRunning 
                ? this.refreshRates.active 
                : this.refreshRates.idle;

        setTimeout(function() { 
            this.run(); 
        }.bind(this), timeout);
    },

    run2: function() {
        var world = this.world;

        _.each(this.callbacks2, function(cb) {
            setTimeout(function() {
                cb.cb(world);
            }, 0);
        });

        setTimeout(function() {
            this.run2();
        }.bind(this), 400);
    },

    start: function() {
        this.isRunning = true;
    },

    stop: function() {
        this.isRunning = false;
    },

    onChange: function(cb) {
        if (typeof cb === 'function') {
            this.callbacks.push(cb);
        }
    },

    onChange2: function(cbName, cb) {
        if (typeof cb === 'function') {
            this.callbacks2.push({name: cbName, cb: cb});
        }
    },

    clearCallbacks: function() {
        this.callbacks = [];
    },

    clearCallbacks2: function(name) {
        this.callbacks2 = _.reject(this.callbacks2, function(cb) { return cb.name === name; });
    }

};
