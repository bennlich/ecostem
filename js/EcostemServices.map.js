'use strict';
var map;

/* Wrapper for the scenario bounding box. Mainly encapsulates degree-to-pixel 
 * translations */
function ScenarioBoundingBox(bbox, leafletMap, scope) {
    this.bbox = bbox;
    this.leafletMap = leafletMap;
    this.calculatePixelBounds();

    /* Recalculate the pixel bounds when zoom levels change, since pixel 
     * dimensions are zoom level-dependent. */
    leafletMap.on('zoomend', function() {
        this.calculatePixelBounds();
    }.bind(this)); 
}

ScenarioBoundingBox.prototype = {
    calculatePixelBounds: function() {
        this.ne = this.leafletMap.project(this.bbox.getNorthEast());
        this.sw = this.leafletMap.project(this.bbox.getSouthWest());
    },

    pixelWidth: function() {
        return Math.abs(Math.floor(this.ne.x - this.sw.x));
    },

    pixelHeight: function() {
        return Math.abs(Math.floor(this.ne.y - this.sw.y));
    },

    xOffsetFromTopLeft: function() {
        var topLeft = this.leafletMap.getPixelBounds();
        return Math.floor(this.sw.x - topLeft.min.x);
    },

    yOffsetFromTopLeft: function() {
        var topLeft = this.leafletMap.getPixelBounds();
        return Math.floor(this.ne.y - topLeft.min.y);
    }
};

/* Leaflet wrapper */
EcostemServices.service('map', ['$location', '$rootScope', function($location, $rootScope) {
    return {
        init: function(id) {
            map = this;

            this.leafletMap = new L.Map(id,{
                zoomControl: false, 
                zoomAnimation: false,
                minZoom: 3, 
                maxZoom: 15
            });

            this.leafletMap.setView(new L.LatLng(35.68832407198268, -105.91811656951903), 12);

            L.control.scale().addTo(this.leafletMap);

            this._zoomControl = L.control.zoom();
            this.addControls();

            this.baseLayers = this._makeBaseLayers();
            this.setBaseLayer(this.baseLayers[3]);

            this.layers = this._makeLayers();

            this.dataLayers = this._makeDataLayers();

            // set map bounds to bbox argument in url
            var urlParams = $location.search(),
                bounds = urlParams.bbox && urlParams.bbox.split(',');
            if (bounds && bounds.length == 4) {
                this.leafletMap.fitBounds([
                    [bounds[0], bounds[1]],
                    [bounds[2], bounds[3]]
                ]);
            }
            
            // update map bounds in bbox argument of url
            var queryString = '?bbox={s},{w},{n},{e}';
            this.leafletMap.on('moveend', function() {
                var bounds = this.getBounds();
                $rootScope.$apply(function() {
                    $location.url(queryString.namedFormat({
                        s : bounds.getSouth(),
                        w : bounds.getWest(),
                        n : bounds.getNorth(),
                        e : bounds.getEast()
                    }));
                });
            });

            this.scenarioBBox = this.createScenarioBBox();
            this.drawBBoxPolygon(this.scenarioBBox.bbox);

            this.world = null;
            WaterModel.onChange(1, function(world) {
                this.world = world;
            }.bind(this));
        },

        /* creates a hardcoded bbox for now */
        createScenarioBBox: function() {
            var south = 35.624512193132595,
                west = -106.03282928466797,
                north = 35.75403529302012,
                east = -105.77739715576172;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return new ScenarioBoundingBox(bounds, this.leafletMap);
        },

        drawBBoxPolygon: function(bbox) {
            var south = bbox.getSouth(),
                west = bbox.getWest(),
                north = bbox.getNorth(),
                east = bbox.getEast();

            var geoJson = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [[west, south], [west, north], [east, north], [east, south], 
                         [west, south]]
                    ]
                }
            };

            var bboxStyle = {
                color: "#000",
                weight: 2,
                opacity: 0.5,
                fillOpacity: 0
            };

            L.geoJson(geoJson, { style: bboxStyle }).addTo(this.leafletMap);
        },

        /* add/remove zoom; the map is "disabled" during simulations */
        removeControls: function() {
            this._zoomControl.removeFrom(this.leafletMap);
        },

        addControls: function() {
            this._zoomControl.addTo(this.leafletMap);
        },

        /* tile urls */
        _osmUrl: function() {
            return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        },

        _topOsmUrl: function(style, ext) {
            return 'http://{s}.tile.stamen.com/' + style + '/{z}/{x}/{y}.' + ext;
        },

        _cloudMadeUrl: function(style) {
            return 'http://{s}.tile.cloudmade.com/f6475b6206f54f9483a35e80bc29a974/' 
                + style 
                + '/256/{z}/{x}/{y}.png';
        },

        /* base layer functions */
        isBaseLayer: function(layer) {
            return layer === this.currentBaseLayer;
        },

        _makeBaseLayers: function() {
            var baseLayerSettings = { minZoom: 2, maxZoom: 18, zIndex: 1, zoomAnimation: false };

            return [{
                name: 'Roadmap',
                leafletLayer: new L.Google('ROADMAP')
            }, {
                name: 'Satellite',
                leafletLayer: new L.Google('SATELLITE')
            }, {
                name: 'Hybrid',
                leafletLayer: new L.Google('HYBRID')
            }, {
                name: 'Terrain',
                leafletLayer: new L.Google('TERRAIN')
            }, {
                name: 'OSM',
                leafletLayer: new L.TileLayer(this._osmUrl(), baseLayerSettings)
            }, {
                name: 'Pale',
                leafletLayer: new L.TileLayer(this._cloudMadeUrl(998), baseLayerSettings)
            }, {
                name: 'Gray',
                leafletLayer: new L.TileLayer(this._cloudMadeUrl(48535), baseLayerSettings)
            }, {
                name: 'TopOSM Relief',
                leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-color-relief', 'jpg'), baseLayerSettings)
            }];
        },

        setBaseLayer: function(layer) {
            if (this.currentBaseLayer) {
                this.leafletMap.removeLayer(this.currentBaseLayer.leafletLayer);
            }
            this.currentBaseLayer = layer;
            this.leafletMap.addLayer(layer.leafletLayer);
            this.leafletMap.fire('baselayerchange', { layer: layer.leafletLayer });
        },

        /* overlay layers */
        _makeLayers: function() {
            return [{
                on: false,
                name: 'Contours',
                leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-contours', 'png'), {zIndex: 10})
            }, {
                on: false,
                name: 'Features',
                leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-features', 'png'), {zIndex: 11})
            }];
        },

        toggleLayer: function(layer) {
            if (layer.on) {
                this.leafletMap.removeLayer(layer.leafletLayer);
            } else {
                this.leafletMap.addLayer(layer.leafletLayer);
            }
            layer.on = !layer.on;
        },

        /* editable data layers */
        _makeDataLayers: function() {
            var colorMap = _.map(_.range(0,21), function(num) {
                return 'rgba(40,105,186,{0})'.format(num/20);
            });

            function getColor(volume) {
                var idx = Math.floor(volume * 3);
                if (idx > 19)
                    idx = 19;
                return colorMap[idx];                    
            }

            var canvasLayer = L.tileLayer.canvas();
            canvasLayer.drawTile = function(canvas, tilePoint, zoom) {
                var ctx = canvas.getContext('2d');

                console.log(tilePoint.x * 256, tilePoint.y * 256);
                console.log(canvas.height, canvas.width);
                ctx.strokeStyle='#000';
                ctx.strokeRect(0,0,canvas.width,canvas.height);
            }.bind(this);

            return [{
                on: false,
                name: 'Fire Severity',
                leafletLayer: new FireSeverityLayer({zIndex: 12})
            }, {
                on: false,
                name: 'Vegetation',
                leafletLayer: new VegetationDensityLayer({zIndex: 13})
            }, {
                on: false,
                name: 'Water Model',
                leafletLayer: canvasLayer
            }];
        },

        toggleDataLayer: function(layer) {
            this.toggleLayer(layer);
        }
    };

}]);
