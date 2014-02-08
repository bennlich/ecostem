'use strict';

function ModelTileRenderer(map, model, renderer, firebased) {
    this.map = map;
    this.model = model;
    this.patchRenderer = renderer;
    this.canvasLayer = null;
}

ModelTileRenderer.prototype = {
    getDrawTileClosure: function(canvas, x, y, zoom) {
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
        // where to stop drawing patches (exclusive)
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

    putData: function(point, brushSize, value) {
        var scenarioScreenWidth = this.map.scenarioBBox.pixelWidth(),
            scenarioScreenHeight = this.map.scenarioBBox.pixelHeight(),

            patchSize = scenarioScreenWidth / this.model.xSize,

            numPatches = Math.ceil(brushSize / patchSize),

            worldX = Math.round(point.x / patchSize - numPatches/2),
            worldY = Math.round(point.y / patchSize - numPatches/2);

        if (numPatches < 1)
            numPatches = 1;

        this.model.putData(worldX,worldY,numPatches,numPatches,value);
    },

    makeLayer: function(layerOpts) {
        layerOpts = layerOpts || {};

        this.canvasLayer = L.tileLayer.canvas(layerOpts);

        this.canvasLayer.drawTile = function(canvas, tilePoint, zoom) {
            var renderStep = this.getDrawTileClosure(canvas, tilePoint.x, tilePoint.y, zoom);
            this.model.onChange(renderStep);
        }.bind(this);

        this.map.leafletMap.on('zoomstart', function() {
            this.model.clearCallbacks();
        }.bind(this));

        return this.canvasLayer;
    }
};
