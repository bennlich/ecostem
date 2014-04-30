
export function computeQuad(sampler) {
    var height = sampler.canvas.height;
    var width = sampler.canvas.width;

    var canvas = document.getElementById('quadCanvas');

    canvas.height = Math.floor(height);
    canvas.width = Math.floor(width);

    var ctx = canvas.getContext('2d');

    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    doQuad(ctx,sampler,0,0,width,height);
}

function drawLine(ctx, x1,y1,x2,y2) {
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);
    x2 = Math.floor(x2);
    y2 = Math.floor(y2);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}

function doQuad(ctx, sampler, x, y, width, height) {
    var min=1000000, max=0;

    for (var i = x; i < x+width; ++i) {
        for (var j = y; j < y+height; ++j) {
            var val = sampler.sample(i,j);
            if (val < min)
                min = val;
            if (val > max)
                max = val;
        }
    }

    if (max - min > 40) {
        drawLine(ctx, x+width/2, y, x+width/2, y+height);
        drawLine(ctx, x, y+height/2, x+width, y+height/2);

        var w = width/2,
            h = height/2;

        doQuad(ctx,sampler,x,y,w,h);
        doQuad(ctx,sampler,x+w,y,w,h);
        doQuad(ctx,sampler,x,y+h,w,h);
        doQuad(ctx,sampler,x+w,y+h,w,h);
    }
}

    /* This code is a start at putting ASC grid files on the map
       -- in particular acequia data for NNMC. It seems to work
       except the acequia data we have seems to be in a different
       projection. */

    /*
    $http.get('data/acequiaData/hydrology.txt')
        .success(function(data) {
            var p = 5;
            var parser = new AscParser();

            parser.parse(data, function() {
                console.log('progress: ', p + '%');
                p += 5;
            });

            var h = parser.headers;
            var width = h.cellsize * h.ncols;
            var height = h.cellsize * h.nrows;

            var southWest = new L.LatLng(h.yllcorner, h.xllcorner);
            var northEast = new L.LatLng(h.yllcorner+height, h.xllcorner+width);
            var box = new L.LatLngBounds(southWest, northEast);
            console.log(box);
            var modelBBox = new ModelBBox(box, map.leafletMap);

            var model = new GenericModel(h.ncols, h.nrows, modelBBox, map.modelPool.virtualWidth, map.modelPool);
            model.setWorld(parser.data);
            var tileRenderer = new ModelTileRenderer(map, model, GenericPatchRenderer(model));
            var tileServer = new ModelTileServer(tileRenderer);

            var obj = {
                name: 'Acequias',
                dataModel: model,
                renderer: tileRenderer,
                server: tileServer
            };

            map.addDataLayer(obj);
        })
        .error(function() {
            console.log('asc download fail');
        });
     */
