'use strict';

var map;

/* Leaflet wrapper */
EcostemServices.service('map', ['$location', '$rootScope', '$q', function($location, $rootScope, $q) {
    return {
        deferred: $q.defer(),
        init: function(id) {
            map = this;

            this.leafletMap = new L.Map(id,{ minZoom: 3, maxZoom: 15 });

            L.control.scale().addTo(this.leafletMap);

            this.modelBBox = this.createRuidosoScenarioBBox();
            this.addBBoxPolygon(this.modelBBox.bbox);

            var bbox = this.modelBBox.bbox;

            var centerLat = bbox.getSouthWest().lat + (bbox.getNorthEast().lat - bbox.getSouthWest().lat)/2;
            var centerLng = bbox.getSouthWest().lng - (bbox.getSouthWest().lng - bbox.getNorthEast().lng)/2;

            console.log(centerLat, centerLng);

            this.leafletMap.setView(new L.LatLng(centerLat, centerLng), 12);

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

            this.deferred.resolve(this);
        },

        /* creates a hardcoded bbox for now */
        createTaosScenarioBBox: function() {
            var south = 36.29852498935906,
                west = -105.85052490234375,
                north = 36.558187766360675,
                east = -105.41656494140625;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return new ModelBBox(bounds, this.leafletMap);
        },

        createRuidosoScenarioBBox: function() {
            var south = 33.357555,
                west = -105.890007,
                north = 33.525149,
                east = -105.584793;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return new ModelBBox(bounds, this.leafletMap);
        },

        addBBoxPolygon: function(bbox) {
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
                if (typeof this.bboxCallback !== 'function')
                    return;

                var bbox_x = this.modelBBox.xOffsetFromTopLeft();
                var bbox_y = this.modelBBox.yOffsetFromTopLeft();

                this.bboxCallback({
                    x: e.containerPoint.x - bbox_x,
                    y: e.containerPoint.y - bbox_y,
                    latlng: e.latlng
                });
            }.bind(this));

            polygon.addTo(this.leafletMap);

            this.scenarioPolygon = polygon;
        },

        onBBoxClickDrag: function(callback) {
            this.bboxCallback = callback;
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
            var ratio = this.modelBBox.pixelHeight() / this.modelBBox.pixelWidth();

            this.modelSet = new ModelSet(map, ratio, $rootScope);

            var zIndex = 12;
            return _.map(_.values(this.modelSet.models), function(model) {
                return {
                    name: model.name,
                    model: model,
                    on: false,
                    disabled: false,
                    editing: false,
                    leafletLayer: model.renderer.makeLayer({zIndex: zIndex++, opacity: 0.85})
                };
            });
        },

        addSensor: function() {
            this.onBBoxClickDrag(function(pos) {
                var marker = L.marker(pos.latlng);
                marker.bindPopup('Hello').openPopup();
                marker.addTo(this.leafletMap);
            }.bind(this));
        }
    };
}]);

