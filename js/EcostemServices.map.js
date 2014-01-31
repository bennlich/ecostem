'use strict';

function Rect(left,top,width,height) {
    this.left = left, this.top = top,
    this.width = width, this.height = height;
}

Rect.prototype = {
    intersect: function(rect) {
        var x0 = Math.max(this.left, rect.left);
        var x1 = Math.min(this.left + this.width, rect.left + rect.width);

        if (x0 <= x1) {
            var y0 = Math.max(this.top, rect.top);
            var y1 = Math.min(this.top + this.height, rect.top + rect.height);

            if (y0 <= y1) {
                return new Rect(x0, y0, x1-x0, y1-y0);
            }
        }
        return null;
    }
};

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
    },

    toRect: function() {
        return new Rect(this.sw.x, this.ne.y, this.pixelWidth(), this.pixelHeight());
    }
};

var map;

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

            this.scenarioBBox = this.createScenarioBBox();
            this.drawBBoxPolygon(this.scenarioBBox.bbox);

            this.baseLayers = this._makeBaseLayers();
            this.setBaseLayer(this.baseLayers[3]);

            this.dataLayerObjects = [];
            
            this.layers = this._makeLayers();
            this.dataLayers = this._makeDataLayers();
            this.modelLayers = this._makeModelLayers();

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

            this.leafletMap.on('zoomstart', function() {
                _.each(this.dataLayerObjects, function(obj) {
                    obj.clearCallbacks();
                });
            });
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

            var polygon = L.geoJson(geoJson, { style: bboxStyle });

            // pass double-clicks down to the map
            polygon.on('dblclick', function(e) { 
                this.leafletMap.fire('dblclick', e); 
            }.bind(this));

            polygon.on('click', function(e) {
                var bbox_x = this.scenarioBBox.xOffsetFromTopLeft();
                var bbox_y = this.scenarioBBox.yOffsetFromTopLeft();

                _.each(this.dataLayerObjects, function(obj) {
                    obj.handleClick({
                        x: e.containerPoint.x - bbox_x,
                        y: e.containerPoint.y - bbox_y
                    });
                });
            }.bind(this));

            polygon.addTo(this.leafletMap);
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
            var firemodel = new FireSeverityModel(512, 320, 1024);

            var fireLayer = new ModelTileRenderer(this, firemodel, FirePatchRenderer);
            var canvasLayer = fireLayer.makeLayer({zIndex: 12});

            this.dataLayerObjects.push(fireLayer);

            return [{
                on: false,
                disabled: false,
                tileRenderer: fireLayer,
                name: 'Fire Severity',
                leafletLayer: canvasLayer
            }];
        },

        _makeModelLayers: function() {
            /* TODO: not the best way to refer to the water model */
            this.waterModel = new WaterModel(256, 160, 1024);

            var waterLayer = new ModelTileRenderer(this, this.waterModel, WaterPatchRenderer);
            var canvasLayer = waterLayer.makeLayer({zIndex: 14});

            this.dataLayerObjects.push(waterLayer);

            return [{
                on: false,
                disabled: false,
                tileRenderer: waterLayer,
                name: 'Water Model',
                leafletLayer: canvasLayer
            }];
        }
    };
}]);

