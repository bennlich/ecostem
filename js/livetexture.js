var LiveTexture = function() {
    function leafletWaterLayer(map, opts) {
        var fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles2");

        var liveLayer = new L.tileLayer.canvas(opts);

        liveLayer.drawTile = function(canvas, tilePoint, zoom) {
            var ctx = canvas.getContext('2d');
            var handle = '{0}_{1}_{2}'.format(zoom, tilePoint.x, tilePoint.y);

            var img = new Image();

            fb.child('listen').set(handle);
            fb.child(handle).on('value', function(data) {
                var base64 = data.val();
                if (!base64)
                    return;

                img.src = base64;
                img.onload = function() {
                    ctx.clearRect(0,0,canvas.width,canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
            });

            map.on('zoomstart', function() {
                fb.child('stopListening').set(handle);
            });
        };

        return liveLayer;
    }

    return {
        leafletWaterLayer : leafletWaterLayer
    };
}();
