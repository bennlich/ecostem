var colorMap = Gradient.multiGradient(
    '#123', 
    [{color: '#505Fa5', steps: 40},
     {color: '#D66783', steps: 100},
     {color: '#fff', steps: 100}]
);

function getColor(elevation) {
    var range = 4000;
    var relativeElevation = elevation;
    var metersPerStep = range / colorMap.length;
    var idx = Math.floor(relativeElevation / metersPerStep);

    return colorMap[idx];
}

function sample(imageData, width, x, y) {
    var idx = (y * width + x) * 4;

    var r = imageData[idx];
    var g = imageData[idx+1];
    var b = imageData[idx+2];

    var elevation = (r * 255 * 255 + g * 255 + b) / 10;

    return elevation;
}

var elevServer = 'http://node.redfish.com/Documents/elevationServer/tiles/{z}/{x}/{y}.png';

var prettyElevLayer = L.tileLayer.canvas({opacity:0.8});

prettyElevLayer.drawTile = function(canvas, tilePoint, zoom) {
    var ctx = canvas.getContext('2d'),
        url = elevServer.namedFormat({x:tilePoint.x, y:tilePoint.y, z:zoom}),
        img = new Image();

    canvas.hidden = true;

    img.crossOrigin = '';
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var imageData = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        /* this can be a lot faster */
        for (var x = 0; x < canvas.width; x++) {
            for (var y = 0; y < canvas.height; ++y) {
                var color = getColor(sample(imageData,canvas.width,x,y));
                ctx.fillStyle = color;
                ctx.fillRect(x,y,1,1);
            }
        }
        canvas.hidden = false;
    };

    img.src = url;
};

var fixedElevLayer = L.tileLayer.canvas({opacity:0.8});
var fixedZoom = 12;

fixedElevLayer.drawTile = function(canvas, tilePoint, zoom) {
    var ctx = canvas.getContext('2d'),
        img = new Image();

    var processUp = function(z,x,y,pixX,pixY,tileSize) {
        if (z === fixedZoom) {
            var img = new Image();
            var tileCanvas = document.createElement('canvas');

            tileCanvas.width = canvas.width;
            tileCanvas.height = canvas.height;

            var tileCtx = tileCanvas.getContext('2d');

            img.crossOrigin = '';
            img.onload = function() {
                tileCtx.drawImage(img,0,0);
                var imageData = tileCtx.getImageData(0,0,tileCanvas.width,tileCanvas.height).data;
                var ratio = tileCanvas.width / tileSize;
                for (var i = 0; i < tileSize; ++i) {
                    for (var j = 0; j < tileSize; ++j) {
                        var color = getColor(sample(imageData, canvas.width, i * ratio, j * ratio));
                        ctx.fillStyle = color;
                        ctx.fillRect(pixX+i, pixY+j, 1, 1);
                    }
                }
            };

            img.src = elevServer.namedFormat({z:z,x:x,y:y});
        } else {
            /* this is kinda silly, can be faster using arithmetic calculations */
            var s = tileSize/2;
            processUp(z+1,x*2,y*2,pixX,pixY,s);
            processUp(z+1,x*2+1,y*2,pixX+s,pixY,s);
            processUp(z+1,x*2,y*2+1,pixX,pixY+s,s);
            processUp(z+1,x*2+1,y*2+1,pixX+s,pixY+s,s);
        }
    };

    if (zoom <= fixedZoom) {
        processUp(zoom, tilePoint.x, tilePoint.y, 0, 0, canvas.width);
    }
};


var map;

function setup(addFixed) {
    var opts = {minZoom:10, maxZoom:14};
    if (addFixed) {
        opts.minZoom = 8;
        opts.maxZoom = 12;
    }

    map = L.map('map', opts);

    var bounds = new L.LatLngBounds(
        new L.LatLng(35.23440284749622,-107.0123291015625),
        new L.LatLng(36.22544232423854,-105.2105712890625)
    );

    map.fitBounds(bounds);
    map.setZoom(10);

    var terrain = new L.Google('TERRAIN'); 
    map.addLayer(terrain);

    if (addFixed) {
        map.addLayer(fixedElevLayer);
    } else {
        map.addLayer(prettyElevLayer);
    }

    map.on('zoomend', updateZoom);
    updateZoom();
}

function updateZoom() {
    $('#zoomvalue').text(map.getZoom());
}

$(document).ready(function() {
    setup(location.hash === '#fixed');
});

