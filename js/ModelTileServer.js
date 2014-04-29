
export function ModelTileServer(modelTileRenderer) {
    this.renderer = modelTileRenderer;
    this.fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles2");
    this.callbacks = [];
    this.isRunning = false;
    this._layerRef = null;
}

ModelTileServer.prototype = {
    hasCallback: function(fbHandle) {
        var cb = _.find(this.callbacks, function(cb) {
            return cb.name === fbHandle;
        });

        return !!cb;
    },

    _init: function(name) {
        var bbox = this.renderer.model.geometry.bbox;
        this._layerRef = this.fb.push({
            name: name,
            zIndex: this.renderer.canvasLayer.options.zIndex,
            bbox: {
                north: bbox.getNorth(),
                west: bbox.getWest(),
                south: bbox.getSouth(),
                east: bbox.getEast()
            }
        });

        this._layerRef.onDisconnect().remove();

        this._layerRef.child('listen').on('value', function(data) {
            var val = data.val();
            if (val)
                this.handleTileRequest(val);
        }.bind(this));

        this._layerRef.child('stopListening').on('value', function(data) {
            var zxy = data.val();

            if (!zxy)
                return;

            this.uninstallTileUpdateLoop(zxy);
            this._layerRef.child(zxy).remove();
        }.bind(this));
    },

    installTileUpdateLoop: function(fbHandle, cb) {
        this.callbacks.push({
            name: fbHandle,
            cb: cb
        });
    },

    uninstallTileUpdateLoop: function(fbHandle) {
        this.callbacks = _.reject(this.callbacks, function(cb) {
            return cb.name === fbHandle;
        });
    },

    start: function(name) {
        this._init(name);
        this.isRunning = true;
        this._run();
    },

    stop: function() {
        this.isRunning = false;
        this._layerRef.remove();
        this.callbacks = [];
    },

    _run: function() {
        if (this.isRunning) {
            var world = this.renderer.model.world;

            _.each(this.callbacks, function(cb) {
                setTimeout(function() {
                    cb.cb(world);
                },0);
            });

            setTimeout(function() {
                this._run();
            }.bind(this), 600);
        }
    },

    handleTileRequest: function(fbHandle) {
        if (this.hasCallback(fbHandle)) {
            return;
        }

        var zxy = fbHandle.split('_'),
            z = zxy[0], x = zxy[1], y = zxy[2];

        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        var tileClosure = this.renderer.getDrawTileClosure(canvas, x, y, z);

        if (tileClosure) {
            if (this.renderer.model.isAnimated) {
                this.installTileUpdateLoop(fbHandle, function(world) {
                    tileClosure(world);
                    this._layerRef.child(fbHandle).set(canvas.toDataURL());
                }.bind(this));
            } else {
                tileClosure(this.renderer.model.world);
                this._layerRef.child(fbHandle).set(canvas.toDataURL());
            }
        }
    }
};
