"use strict";

import {LocalStorage} from '../st-api/LocalStorage';
import {computeQuad} from './Experiments';

export var ElevationService = ['$rootScope', '$q', function($rootScope, $q) {
    return {
        deferred: $q.defer(),
        elevationServer: "http://node.redfish.com/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}",
        canvas: null,
        ctx: null,
        imageData: null,
        width: 0,
        samplingWidth: 1024,
        elevationCacheDir: '/elevation_cache',
        storage: new LocalStorage(),

        init: function(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = this.samplingWidth;

            this.deferred.resolve(this);
        },

        hasData: function() {
            return this.imageData !== null;
        },

        _bboxToString: function(bbox) {
            return '{s}_{w}_{n}_{e}'.namedFormat({
                s : bbox.getSouth(),
                w : bbox.getWest(),
                n : bbox.getNorth(),
                e : bbox.getEast()
            });
        },

        _getCachedElevation: function(bbox, successCb, notFoundCb) {
            var bboxString = this._bboxToString(bbox);
            this.storage.withDir(this.elevationCacheDir, (dir) => {
                this.storage.dirGetFile(dir, bboxString, (fileObj) => {
                    this.storage.readFileAsByteArray(fileObj, successCb);
                }, notFoundCb);
            });
        },

        _putCachedElevation :function(bbox, data) {
            var bboxString = this._bboxToString(bbox);
            this.storage.withDir(this.elevationCacheDir, (dir) => {
                this.storage.writeFile('{0}/{1}'.format(dir, bboxString), data);
            });
        },

        /* Loads elevation data for the current map bounds. Downloads the
         * elevation image and writes it into a canvas. The canvas is used
         * for pixel-level access into the image, as well as for optionally
         * viewing the elevation image.
         */
        loadElevationData: function(scenario, callback) {
            var img = new Image();
            var height = Math.floor(scenario.pixelHeight() * this.width/scenario.pixelWidth());

            this.canvas.width = this.width;
            this.canvas.height = height;

            this._getCachedElevation(scenario.bbox, (data) => {
                /* cached data was found */

                var imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

                _.each(data, function(d, idx) {
                    imageData.data[idx] = d;
                });

                this.imageData = data;
                this.ctx.putImageData(imageData, 0, 0);

                computeQuad(this);

                if (typeof callback === 'function') {
                    $rootScope.$apply(callback);
                }
            }, () => {
                /* cached data was not found. We have to hit the server. */

                img.crossOrigin = '';

                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);

                    this.imageData = this.ctx.getImageData(0, 0, this.width, height).data;

                    /* cache the elevation */
                    this._putCachedElevation(scenario.bbox, this.imageData);

                    computeQuad(this);

                    if (typeof callback === 'function') {
                        $rootScope.$apply(callback);
                    }
                };

                img.src = this.elevationServer.namedFormat({
                    s : scenario.bbox.getSouth(),
                    w : scenario.bbox.getWest(),
                    n : scenario.bbox.getNorth(),
                    e : scenario.bbox.getEast(),
                    width: this.width,
                    height: height
                });
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
}];
