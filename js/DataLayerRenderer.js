'use strict';

function DataLayerRenderer(map, model, renderer) {
    this.map = map;
    this.model = model;
    this.renderer = renderer;
    this.canvasLayer = null;

    this._drawTile = function(canvas, tilePoint, zoom) {
        var ctx = canvas.getContext('2d');

        // absolute pixel coordinates of top-left corner of tile
        var tileX = tilePoint.x * canvas.width;
        var tileY = tilePoint.y * canvas.height;

        this.map.scenarioBBox.calculatePixelBounds();

        var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);
        var scenarioRect = this.map.scenarioBBox.toRect();

        // the sub-rectangle of the canvas that intersects the scenario
        var intersection = canvasRect.intersect(scenarioRect);

        if (intersection == null) {
            // no intersection, nothing to do
            return;
        }

        // size of patches to render visually
        var paintSize = 8;

        // patch size relative to the bounding box:
        // scenario width / number of cells in the x dimension
        var patchSize = scenarioRect.width / this.model.getDims().xSize;

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

                    this.renderer.render(ctx, world, intI, intJ, p, k, paintSize, paintSize);
                }
            }

            ctx.strokeStyle = '#888';
            ctx.strokeRect(0,0,canvas.width,canvas.height);
        }.bind(this);

        this.model.onChange(renderStep);
    };

    this.handleClick = function(pt) {
        var dims = this.model.getDims(),
            scenarioScreenWidth = this.map.scenarioBBox.pixelWidth(),
            scenarioScreenHeight = this.map.scenarioBBox.pixelHeight(),

            elemSize = scenarioScreenWidth / dims.xSize,

            x = Math.floor(pt.x / elemSize),
            y = Math.floor(pt.y / elemSize),

            // draw bigger areas at lower zooms
            size = Math.floor(30 / elemSize) || 1;

        this.model.putData(x,y,size,size);
    };

    this.makeLayer = function(layerOpts) {
        layerOpts = layerOpts || {};

        this.canvasLayer = L.tileLayer.canvas(layerOpts);
        this.canvasLayer.drawTile = function(canvas, tilePoint, zoom) {
            this._drawTile(canvas, tilePoint, zoom);
        }.bind(this);

        return this.canvasLayer;
    };
};
