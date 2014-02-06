'use strict';

function LiveTexture(leafletMap) {
    this._appearedCallbacks = [];
    this._disappearedCallbacks = [];
    this._map = leafletMap;
    this._layers = [];

    this._init();
}

LiveTexture.prototype = {
    _init: function() {
        var fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles2");

        fb.on('child_added', function(snap) {
            if (!snap.val())
                return;

            var id = snap.name(),
                name = snap.val().name,
                ref = snap.ref(),
                layer = this._leafletLayer(ref);

            this._layers.push({ id: id, name: name, leafletLayer: layer });

            _.each(this._appearedCallbacks, function(cb) {
                cb(id, name, layer);
            });
        }.bind(this));

        fb.on('child_removed', function(snap) {
            if (!snap.val())
                return;

            var id = snap.name(),
                name = snap.val().name;

            var layer = _.find(this._layers, function(layer) {
                return id === layer.id;
            });

            this._layers = _.without(this._layers, layer);

            _.each(this._disappearedCallbacks, function(cb) {
                cb(id, name, layer.leafletLayer);
            });
        }.bind(this));
    },

    _leafletLayer: function(ref) {
        var liveLayer = new L.tileLayer.canvas(),
            map = this._map;

        liveLayer.drawTile = function(canvas, tilePoint, zoom) {
            var ctx = canvas.getContext('2d');
            var handle = '{0}_{1}_{2}'.format(zoom, tilePoint.x, tilePoint.y);

            var img = new Image();

            ref.child('listen').set(handle);
            ref.child(handle).on('value', function(data) {
                var base64 = data.val();
                if (!base64)
                    return;

                img.src = base64;
                img.onload = function() {
                    ctx.clearRect(0,0,canvas.width,canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
            });

            var onZoomStart = function() {
                ref.child('stopListening').set(handle);
                map.off('zoomstart', onZoomStart);
            };

            map.on('zoomstart', onZoomStart);
        };

        return liveLayer;
    },

    findLayer: function(id) {
        var layer = _.find(this._layers, function(layer) {
            return layer.id === id;
        });

        return layer.leafletLayer;
    },

    onLayerAppeared: function(cb) {
        if (typeof cb === 'function') {
            this._appearedCallbacks.push(cb);
        }
    },

    onLayerDisappeared: function(cb) {
        if (typeof cb === 'function') {
            this._disappearedCallbacks.push(cb);
        }
    }
};
