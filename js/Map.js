/* Leaflet wrapper */

function Map(id) {
    this.map = new L.Map(id);

    this.map.setView(new L.LatLng(45.64086777956698, -121.94618225097656),4);
    L.control.scale().addTo(this.map);

    this.baseLayers = this.makeBaseLayers();
    this.setBaseLayer(this.baseLayers[1]);
}

Map.prototype = {
    isBaseLayer: function(layer) {
        return layer === this.currentBaseLayer;
    },
    setBaseLayer: function(layer) {
        _.each(this.baseLayers, function(baseLayer) {
            if (layer === baseLayer) {
                this.currentBaseLayer = layer;
                this.map.addLayer(layer.leafletLayerObject);
                this.map.fire('baselayerchange', { layer: layer.leafletLayerObject });
            } else {
                this.map.removeLayer(baseLayer.leafletLayerObject);
            }
        }.bind(this));
    },
    makeBaseLayers: function() {
        var cloudmadeUrl = function(style) {
            return 'http://{s}.tile.cloudmade.com/f6475b6206f54f9483a35e80bc29a974/' 
                + style 
                + '/256/{z}/{x}/{y}.png';
        };
        var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        var baseLayerSettings = { minZoom: 2, maxZoom: 18 };

        return [{
            name: 'OSM',
            leafletLayerObject: new L.TileLayer(osmUrl, baseLayerSettings)
        }, {
            name: 'Pale',
            leafletLayerObject: new L.TileLayer(cloudmadeUrl(998), baseLayerSettings)
        }, {
            name: 'Gray',
            leafletLayerObject: new L.TileLayer(cloudmadeUrl(48535), baseLayerSettings)
        }];
    }
};

