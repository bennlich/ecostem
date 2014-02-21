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

        // the rectangular area of canvas tile that intersects the scenario
        var intersection = canvasRect.intersect(scenarioRect);

        if (intersection == null) {
            // no intersection, nothing to do
            return null;
        }

        // size of a patch in pixels at current zoom
        var patchSize = scenarioRect.width / this.model.xSize;

        // minimum size of brush, in pixels (i.e. finest resolution at which to render patches)
        // (really only used when rendering multiple patches in a single brushstroke)
        var paintSize = patchSize;

        if (paintSize < patchSize)
            paintSize = patchSize; // every patch rendered as its own square

        var patchesPerBrush = paintSize / patchSize;

        // top-left corner of the intersection, relative to 
        // the top-left corner of the scenario, in pixels
        var intersectionX = Math.abs(scenarioRect.left - intersection.left); // in range [0, scenarioRect.width]
        var intersectionY = Math.abs(scenarioRect.top - intersection.top); // in range [0, scenarioRect.height]

        // same as above, in world coordinates
        var startWorldX = Math.floor(intersectionX / patchSize); // in range [0, model.xSize]
        var startWorldY = Math.floor(intersectionY / patchSize); // in range [0, model.ySize]

        // 1 patch beyond the bottom-right corner of the intersection, in world coordinates
        var endWorldX = Math.floor((intersectionX + intersection.width)/patchSize)+1; // in range [0, model.xSize+1]
        var endWorldY = Math.floor((intersectionY + intersection.height)/patchSize)+1; // in range [0, model.ySize+1]

        // coordinates of the top-left patch in this tile, relative to
        // the top-left corner of the tile, in pixels
        var drawStartX = intersection.left - tileX - (intersectionX % paintSize);
        var drawStartY = intersection.top - tileY - (intersectionY % paintSize);

        var renderStep = function(world) {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            for (var worldX = startWorldX, p = drawStartX; worldX < endWorldX; worldX += patchesPerBrush, p += paintSize) {
                for (var worldY = startWorldY, k = drawStartY; worldY < endWorldY; worldY += patchesPerBrush, k += paintSize) {
                    var intWorldX = Math.floor(worldX);
                    var intWorldY = Math.floor(worldY);

                    this.patchRenderer.render(ctx, world, intWorldX, intWorldY, p, k, paintSize, paintSize);
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

        this.refreshLayer();
    },

    makeLayer: function(layerOpts) {
        layerOpts = layerOpts || {};

        this.canvasLayer = L.tileLayer.canvas(layerOpts);

        this.canvasLayer.drawTile = function(canvas, tilePoint, zoom) {
            var renderStep = this.getDrawTileClosure(canvas, tilePoint.x, tilePoint.y, zoom);
            if (this.model.isAnimated)
                this.model.onChange(renderStep);
            if (!this.model.isAnimated || !this.model.isRunning) {
                if (renderStep)
                    renderStep(this.model.world);
            }
        }.bind(this);

        this.map.leafletMap.on('zoomstart', function() {
            this.model.clearCallbacks();
        }.bind(this));

        this.map.leafletMap.on('layerremove', function(e) {
            if (e.layer === this.canvasLayer) {
                this.model.clearCallbacks();
            }
        }.bind(this));

        return this.canvasLayer;
    },

    refreshLayer: function() {
        if (this.model.isAnimated) {
            if (!this.model.isRunning)
                this.model.runCallbacks();
        } else {
            this.canvasLayer.redraw();
        }
    }
};
