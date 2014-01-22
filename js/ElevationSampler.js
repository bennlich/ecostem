'use strict';

function ElevationSampler(canvas, width) {
    /* Elevation server sitting upstairs @ simtable */
    this.elevationServer = "http://70.90.201.217/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}"; 
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageData = null;
    this.width = width;
}

ElevationSampler.prototype = {
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
        var idx = (y * this.canvas.width + x) * 4;

        var r = this.imageData[idx];
        var g = this.imageData[idx+1];
        var b = this.imageData[idx+2];

        return (r * 255 * 255 + g * 255 + b) / 10;
    }
};
