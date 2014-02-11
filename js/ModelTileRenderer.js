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

        // the rectangular area of canvas that intersects the scenario
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

        // if (paintSize < patchSize)
            paintSize = patchSize;

        // number of objects to skip while iterating
        var skip = paintSize / patchSize;

        // top-left corner of the intersection
        // relative to the top-left corner of the scenario in pixels
        var offsetX = Math.abs(scenarioRect.left - intersection.left); // in range [0, scenarioRect.width]
        var offsetY = Math.abs(scenarioRect.top - intersection.top); // in range [0, scenarioRect.height]

        // top-left corner of the intersection in world coordinates
        var startWorldX = Math.floor(offsetX / patchSize); // in range [0, model.xSize]
        var startWorldY = Math.floor(offsetY / patchSize); // in range [0, model.ySize]
        
        // 1 patch beyond the bottom-right corner of the intersection in world coordinates
        var endX = Math.floor((offsetX + intersection.width)/patchSize)+1; // in range [0, model.xSize+1]
        var endY = Math.floor((offsetY + intersection.height)/patchSize)+1; // in range [0, model.ySize+1]

        // pixel coordinates of the top-left patch for this tile
        var drawStartX = intersection.left - tileX - (offsetX % paintSize);
        var drawStartY = intersection.top - tileY - (offsetY % paintSize);

        function worldToPixel(worldCoord) {
            return [
                drawStartX + Math.floor(worldCoord[0]-startWorldX)*paintSize,
                drawStartY + Math.floor(worldCoord[1]-startWorldY)*paintSize
            ];
        }

        var renderStep = function(world) {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            this.model.quadtree.visit(function(node, x1, y1, x2, y2) {
                if (node.filled) {
                    ctx.fillStyle = 'rgb(0,0,0)';
                    if (node.leaf && node.point) {
                        var pixelTopLeft = worldToPixel(node.point);
                        ctx.fillRect(pixelTopLeft[0], pixelTopLeft[1], paintSize, paintSize);
                    }
                    else {
                        var pixelTopLeft = worldToPixel([x1, y1]);
                        var pixelBottomRight = worldToPixel([x2, y2]);
                        var drawWidth = pixelBottomRight[0] - pixelTopLeft[0];
                        var drawHeight = pixelBottomRight[1] - pixelTopLeft[1];
                        ctx.fillRect(pixelTopLeft[0], pixelTopLeft[1], drawWidth, drawHeight);
                    }
                    return true;
                }
            });

            for (var worldX = startWorldX, p = drawStartX; worldX < endX; worldX += skip, p += paintSize) {
                for (var worldY = startWorldY, k = drawStartY; worldY < endY; worldY += skip, k += paintSize) {
                    var intWorldX = Math.floor(worldX);
                    var intWorldY = Math.floor(worldY);

                    this.patchRenderer.render(ctx, world, intWorldX, intWorldY, p, k, paintSize, paintSize);
                }
            }

            // var imageData = canvas.toDataURL();
            // console.log(imageData);

            // this shows the tile boundaries
            ctx.strokeStyle = '#888';
            ctx.strokeRect(0,0,canvas.width,canvas.height);
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
