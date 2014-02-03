'use strict';

function ModelTileRenderer(map, model, renderer, firebased) {
    this.map = map;
    this.model = model;
    this.patchRenderer = renderer;
    this.canvasLayer = null;
    this.handlers = {};
    this.firebased = firebased;
    this.fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles");

    if (this.firebased) {
        this.fb.child('listen').on('value', function(data) {
            this.handleTileRequest(data.val());
        }.bind(this));

        this.fb.child('stopListening').on('value', function(data) {
            var zxy = data.val();

            if (!zxy)
                return;

            delete this.handlers[zxy];

            this.model.clearCallbacks2(zxy);
            this.fb.child(zxy).remove();
        }.bind(this));
    }
}

ModelTileRenderer.prototype = {
    handleTileRequest: function(fbHandle) {
        var zxy = fbHandle.split('_'),
            z = zxy[0], x = zxy[1], y = zxy[2];

        if (this.handlers[fbHandle]) {
            return;
        }

        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        var renderStep = this._drawTile(canvas, x, y, z);

        if (renderStep) {
            this.handlers[fbHandle] = true;

            this.model.onChange2(fbHandle, function(world) {
                renderStep(world);
                this.fb.child(fbHandle).set(canvas.toDataURL());
            }.bind(this));
        }
    },

    _drawTile: function(canvas, x, y, zoom) {
        var ctx = canvas.getContext('2d');

        // absolute pixel coordinates of top-left corner of tile
        var tileX = x * canvas.width;
        var tileY = y * canvas.height;

        var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);
        var scenarioRect = this.map.scenarioBBox.toRect(zoom);

        // the sub-rectangle of the canvas that intersects the scenario
        var intersection = canvasRect.intersect(scenarioRect);

        if (intersection == null) {
            // no intersection, nothing to do
            return null;
        }

        // size of patches to render visually
        var paintSize = 8;

        // patch size relative to the bounding box:
        // scenario width / number of cells in the x dimension
        var patchSize = scenarioRect.width / this.model.xSize;

        if (paintSize < patchSize)
            paintSize = patchSize;

        // number of objects to skip while iterating
        var skip = paintSize / patchSize;

        // the offset of the intersection's top-left corner relative to
        // the scenario top-left corner
        var offsetX = Math.abs(scenarioRect.left - intersection.left);
        var offsetY = Math.abs(scenarioRect.top - intersection.top);

        // top-left corner of the world relevant to this tile
        var startX = Math.floor(offsetX / patchSize);
        var startY = Math.floor(offsetY / patchSize);
        // where to stop drawing patches
        var endX = Math.floor((offsetX + intersection.width)/patchSize)+1;
        var endY = Math.floor((offsetY + intersection.height)/patchSize)+1;

        // min-x and min-y pixel positions where to begin drawing patches
        var drawStartX = intersection.left - tileX - (offsetX % paintSize);
        var drawStartY = intersection.top - tileY - (offsetY % paintSize);

        var renderStep = function(world) {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            for (var i = startX, p = drawStartX; i < endX; i += skip, p += paintSize) {
                for (var j = startY, k = drawStartY; j < endY; j += skip, k += paintSize) {
                    var intI = Math.floor(i);
                    var intJ = Math.floor(j);

                    this.patchRenderer.render(ctx, world, intI, intJ, p, k, paintSize, paintSize);
                }
            }

            // var imageData = canvas.toDataURL();
            // console.log(imageData);

            // this shows the tile boundaries
            // ctx.strokeStyle = '#888';
            // ctx.strokeRect(0,0,canvas.width,canvas.height);
        }.bind(this);

        return renderStep;
    },

    putData: function(pt, brushSize, value) {
        var scenarioScreenWidth = this.map.scenarioBBox.pixelWidth(),
            scenarioScreenHeight = this.map.scenarioBBox.pixelHeight(),

            elemSize = scenarioScreenWidth / this.model.xSize,

            size = Math.ceil(this.model.xSize * (brushSize / scenarioScreenWidth)),

            x = Math.floor(pt.x / elemSize),
            y = Math.floor(pt.y / elemSize);

        if (size < 1)
            size = 1;

        this.model.putData(x,y,size,size,value);
    },

    makeLayer: function(layerOpts) {
        layerOpts = layerOpts || {};

        this.canvasLayer = L.tileLayer.canvas(layerOpts);

        this.canvasLayer.drawTile = function(canvas, tilePoint, zoom) {
            var renderStep = this._drawTile(canvas, tilePoint.x, tilePoint.y, zoom);
            this.model.onChange(renderStep);
        }.bind(this);

        this.map.leafletMap.on('zoomstart', function() {
            this.model.clearCallbacks();
        }.bind(this));

        return this.canvasLayer;
    }
};
