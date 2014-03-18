'use strict';

function DataModel(xs, ys, bbox, fixedGeometryWidth, modelSet) {
    this.xSize = xs;
    this.ySize = ys;
    this.bbox = bbox;
    this.sampleSpacing = fixedGeometryWidth / xs;
    this.modelSet = modelSet;
    this.world = null;
    this.callbacks = [];
    this.isAnimated = false;
    this.isRunning = false;
    this.hasControls = false;
    this.timeoutValue = 60;
    this.animID = null;

    /* TODO -- this is iffy ... the distinction between whether 
     * there is an "Edit" button and whether you can manually paint */

    this.editable = true;
    this.canPaint = true;
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

        this.modelSet.safeApply(function() {
            for (var i = x; i < x + width; ++i) {
                for (var j = y; j < y + height; ++j) {
                    for (var key in obj) {
                        this.world[i][j][key] = obj[key];
                    }
                }
            }
        }.bind(this));
    },

    latLngToModelXY: function(latlng) {
        /* TODO: don't want datamodel to be reliant on leafletMap
           maybe provide an object like GISGrid that can do these
           calculations and could be implemented both in terms of
           leaflet and openlayers */

        var zoom = 15,
            point = this.bbox.leafletMap.project(latlng, zoom),
            ne = this.bbox.leafletMap.project(this.bbox.bbox.getNorthWest(), zoom),
            width = this.bbox.pixelWidth(zoom),
            height = this.bbox.pixelHeight(zoom);

        var distX = point.x - ne.x,
            distY = point.y - ne.y;

        var x = Math.floor(distX * (this.xSize / width)),
            y = Math.floor(distY * (this.ySize / height));

        return {x:x, y:y};
    },

    modelXYToLatLng: function(xy) {
        var zoom = 15,
            ne = this.bbox.leafletMap.project(this.bbox.bbox.getNorthWest(), zoom),
            width = this.bbox.pixelWidth(zoom),
            height = this.bbox.pixelHeight(zoom);

        var pixelX = xy.x * (width / this.xSize),
            pixelY = xy.y * (height / this.ySize);

        var point = new L.Point(ne.x + pixelX, ne.y + pixelY);

        return this.bbox.leafletMap.unproject(point, zoom);
    },

    sample: function(latlng) {
        var xy = this.latLngToModelXY(latlng);

        if (xy.x < 0 || xy.x >= this.xSize || xy.y < 0 || xy.y >= this.ySize) {
            return undefined;
        }

        return this.world[xy.x][xy.y];
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
            //$this.run(); 
            $this.animID = window.requestAnimationFrame($this.run.bind($this));
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
        //this.run();
        this.animID = window.requestAnimationFrame(this.run.bind(this));
    },

    stop: function() {
        this.isRunning = false;
        window.cancelAnimationFrame(this.animID);
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
