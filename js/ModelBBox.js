'use strict';

/* Wrapper for the scenario bounding box. Mainly encapsulates degree-to-pixel 
 * translations */
function ModelBBox(bbox, leafletMap, scope) {
    this.bbox = bbox;
    this.leafletMap = leafletMap;
}

ModelBBox.prototype = {
    calculatePixelBounds: function(zoom) {
        return {
            ne: this.leafletMap.project(this.bbox.getNorthEast(), zoom),
            sw: this.leafletMap.project(this.bbox.getSouthWest(), zoom)
        };
    },

    pixelWidth: function(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return Math.abs(Math.floor(bounds.ne.x - bounds.sw.x));
    },

    pixelHeight: function(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return Math.abs(Math.floor(bounds.ne.y - bounds.sw.y));
    },

    xOffsetFromTopLeft: function(zoom) {
        var topLeft = this.leafletMap.getPixelBounds(),
            bounds = this.calculatePixelBounds(zoom);
        return Math.floor(bounds.sw.x - topLeft.min.x);
    },

    yOffsetFromTopLeft: function(zoom) {
        var topLeft = this.leafletMap.getPixelBounds(),
            bounds = this.calculatePixelBounds(zoom);
        return Math.floor(bounds.ne.y - topLeft.min.y);
    },

    toRect: function(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return new Rect(bounds.sw.x, bounds.ne.y, this.pixelWidth(zoom), this.pixelHeight(zoom));
    }
};
