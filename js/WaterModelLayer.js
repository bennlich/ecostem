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

        // size of patches to render visually
        var paintSize = 8;

        // patch size relative to the bounding box:
        // scenario width / number of cells in the x dimension
        var patchSize = box_width / WaterModel.getDims()[0];

        if (paintSize < patchSize)
            paintSize = patchSize;

        // number of objects to skip while iterating
        var skip = paintSize / patchSize;

        // the offset of the intersection's top-left corner relative to
        // the scenario top-left corner
        var offset_x = Math.abs(box_x - intersection.left);
        var offset_y = Math.abs(box_y - intersection.top);

        // top-left corner of the world relevant to this tile
        var start_x = Math.floor(offset_x / patchSize);
        var start_y = Math.floor(offset_y / patchSize);


        // min-x and min-y pixel positions where to begin drawing patches
        var start_p = offset_x % paintSize;
        var start_k = offset_y % paintSize;

        // where to stop drawing patches
        var end_x = Math.floor((offset_x + intersection.width)/patchSize)+1;
        var end_y = Math.floor((offset_y + intersection.height)/patchSize)+1;

        var i_x = intersection.left - x;
        var i_y = intersection.top - y;

        WaterModel.onChange(function(world) {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            for (var i = start_x, p = i_x-start_p; i < end_x; i += skip, p += paintSize) {
                for (var j = start_y, k = i_y-start_k; j < end_y; j += skip, k += paintSize) {
                    var patch;

                    var intI = Math.floor(i);
                    var intJ = Math.floor(j);

                    if (!world[intI] || !(patch = world[intI][intJ])) {
                        continue;
                    }

                    /* find the patches under the paintSize x paintSize square
                     * and average their volume to compute a color of this current 
                     * painted "patch".
                     */

                    var size = Math.floor(skip);
                    var num = 0, sum = 0;

                    for (var x = 0; x < size; ++x) {
                        for (var y = 0; y < size; ++y) {
                            var neighbor;
                            if (world[intI + x] && (neighbor = world[intI + x][intJ + y])) {
                                num++;
                                sum += neighbor.volume;
                            }
                        }
                    }

                    if (sum/num > 0) {
                        ctx.fillStyle = getColor(sum/num);
                        ctx.fillRect(p, k, paintSize, paintSize);
                    }
                }
            }
        });
    }

    function click(pt) {
        var dims = WaterModel.getDims(),
            scenarioScreenWidth = map.scenarioBBox.pixelWidth(),
            scenarioScreenHeight = map.scenarioBBox.pixelHeight(),

            elemSize = scenarioScreenWidth / dims[0],

            x = Math.floor(pt.x / elemSize),
            y = Math.floor(pt.y / elemSize),

            // draw bigger areas at lower zooms
            size = Math.floor(30 / elemSize) || 1;

        WaterModel.putWater(x,y,size,size);
    }

    function create(_map, opts) {
        map = _map;

        opts = opts || {};
        _.extend(opts, {zIndex: 14});

        var canvasLayer = L.tileLayer.canvas(opts);
        canvasLayer.drawTile = drawTile;

        return canvasLayer;
    }

    return { 
        create : create,
        click : click
    };
}();
