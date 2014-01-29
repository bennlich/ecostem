'use strict';

EcostemServices.service('elevationSampler', [function() {
    return {
        elevationServer: "http://70.90.201.217/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}",
        canvas: null,
        ctx: null,
        imageData: null,
        width: 0,
        fixedScenarioWidth: 1024,

        init: function(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = this.fixedScenarioWidth;
        },

        hasData: function() {
            return this.imageData != null;
        },

        /* Loads elevation data for the current map bounds. Downloads the
         * elevation image and writes it into a canvas. The canvas is used
         * for pixel-level access into the image, as well as for optionally
         * viewing the elevation image.
         */
        loadElevationData: function(scope, callback) {
            var scenario = scope.map.scenarioBBox;

            var img = new Image();
            var height = Math.floor(scenario.pixelHeight() * this.width/scenario.pixelWidth());

            img.crossOrigin = '';

            img.onload = function() {
                this.canvas.width = this.width;
                this.canvas.height = height;

                this.ctx.drawImage(img, 0, 0);

                this.imageData = this.ctx.getImageData(0, 0, this.width, height).data;

                computeQuad(this);

                if (typeof callback === 'function') {
                    scope.$apply(callback);
                }
            }.bind(this);

            img.src = this.elevationServer.namedFormat({
                s : scenario.bbox.getSouth(),
                w : scenario.bbox.getWest(),
                n : scenario.bbox.getNorth(),
                e : scenario.bbox.getEast(),
                width: this.width,
                height: height
            });

        },

        /* Gives the elevation value at a given pixel. The value is
         * encoded in the pixel's color value using the formula:
         *  (red * 255^2 + green * 255 + blue)/10
         */
        sample: function(x,y) {
            x = Math.floor(x);
            y = Math.floor(y);

            var idx = (y * this.canvas.width + x) * 4;

            var r = this.imageData[idx];
            var g = this.imageData[idx+1];
            var b = this.imageData[idx+2];

            var elevation = (r * 255 * 255 + g * 255 + b) / 10;

            return elevation;
        }
    };
}]);

function computeQuad(sampler) {
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
