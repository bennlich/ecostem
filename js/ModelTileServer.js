'use strict';

function ModelTileServer(modelTileRenderer) {
    this.renderer = modelTileRenderer;
    this.fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles2");
    this.callbacks = [];

    this.init();
}

ModelTileServer.prototype = {
    hasCallback: function(fbHandle) {
        var cb = _.find(this.callbacks, function(cb) {
            return cb.name === fbHandle;
        });

        return !!cb;
    },

    init: function() {
        this.fb.child('listen').on('value', function(data) {
            this.handleTileRequest(data.val());
        }.bind(this));

        this.fb.child('stopListening').on('value', function(data) {
            var zxy = data.val();

            if (!zxy)
                return;

            this.uninstallTileUpdateLoop(zxy);
            this.fb.child(zxy).remove();
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

    runServer: function() {
        var world = this.renderer.model.world;

        _.each(this.callbacks, function(cb) {
            setTimeout(function() {
                cb.cb(world);
            },0);
        });

        setTimeout(function() {
            this.runServer();
        }.bind(this), 400);
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
            this.installTileUpdateLoop(fbHandle, function(world) {
                tileClosure(world);
                this.fb.child(fbHandle).set(canvas.toDataURL());
            }.bind(this));
        }
    }
};
