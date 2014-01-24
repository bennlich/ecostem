'use strict';

var WaterModelLayer = function() {
    var map;

    var colorMap = _.map(_.range(0,21), function(num) {
        return 'rgba(40,105,186,{0})'.format(num/20);
    });

    function getColor(volume) {
        var idx = Math.floor(volume * 3);
        if (idx > 19)
            idx = 19;
        return colorMap[idx];                    
    }

    function drawTile(canvas, tilePoint, zoom) {
        var ctx = canvas.getContext('2d');

        // absolute pixel coordinates of top-left corner of tile
        var x = tilePoint.x * canvas.width;
        var y = tilePoint.y * canvas.height;

        map.scenarioBBox.calculatePixelBounds();

        // absolute pixel coords and dimensions of the scenario
        var box_x = map.scenarioBBox.sw.x;
        var box_y = map.scenarioBBox.ne.y;
        var box_width = map.scenarioBBox.pixelWidth();
        var box_height = map.scenarioBBox.pixelHeight();

        var canvasRect = new Rect(x, y, canvas.width, canvas.height);
        var boxRect = new Rect(box_x, box_y, box_width, box_height);

        // the sub-rectangle of the canvas that intersects the scenario
        var intersection = canvasRect.intersect(boxRect);

        if (intersection == null) {
            // no intersection, nothing to do
            return;
        }

        // patch size: scenario width / number of cells in the x dimension
        var patchSize = box_width / WaterModel.getDims()[0];

        // the offset of the intersection's top-left corner relative to
        // the scenario top-left corner
        var offset_x = Math.abs(box_x - intersection.left);
        var offset_y = Math.abs(box_y - intersection.top);

        // top-left corner of the world relevant to this tile
        var start_x = Math.floor(offset_x / patchSize);
        var start_y = Math.floor(offset_y / patchSize);

        // min-x and min-y pixel positions where to begin drawing patches
        var start_p = offset_x % patchSize;
        var start_k = offset_y % patchSize;

        // where to stop drawing patches
        var end_x = Math.floor((offset_x + intersection.width)/patchSize)+1;
        var end_y = Math.floor((offset_y + intersection.height)/patchSize)+1;

        var i_x = intersection.left - x;
        var i_y = intersection.top - y;

        WaterModel.onChange(function(world) {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            for (var i = start_x, p = i_x-start_p; i < end_x; ++i, p += patchSize) {
                for (var j = start_y, k = i_y-start_k; j < end_y; ++j, k += patchSize) {
                    var patch;

                    if (!world[i] || !(patch = world[i][j])) {
                        continue;
                    }

                    if (patch.volume > 0) {
                        ctx.fillStyle = getColor(patch.volume);
                        ctx.fillRect(p, k, patchSize, patchSize);
                    }
                }
            }
        });
    }

    function create(_map) {
        map = _map;

        var canvasLayer = L.tileLayer.canvas({zIndex: 14});
        canvasLayer.drawTile = drawTile;

        return canvasLayer;
    }

    return { create : create };
}();
