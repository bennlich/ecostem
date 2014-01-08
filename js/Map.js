'use strict';

/* Leaflet wrapper */
angular.module('Ecostem.services', [])
    .service('map', ['$location', '$rootScope', function($location, $rootScope) {
        return {
            init: function(id) {
                this.leafletMap = new L.Map(id,{zoomControl: false, minZoom: 3, maxZoom: 15});

                this.leafletMap.setView(new L.LatLng(35.68832407198268, -105.91811656951903), 12);

                L.control.scale().addTo(this.leafletMap);

                this.zoomControl = L.control.zoom();
                this.addControls();

                this.baseLayers = this.makeBaseLayers();
                this.setBaseLayer(this.baseLayers[3]);

                this.layers = this.makeLayers();

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
            },

            /* add/remove zoom; the map is "disabled" during simulations */
            removeControls: function() {
                this.zoomControl.removeFrom(this.leafletMap);
            },

            addControls: function() {
                this.zoomControl.addTo(this.leafletMap);
            },

            /* tile urls */
            osmUrl: function() {
                return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            },

            topOsmUrl: function(style, ext) {
                return 'http://{s}.tile.stamen.com/' + style + '/{z}/{x}/{y}.' + ext;
            },

            cloudMadeUrl: function(style) {
                return 'http://{s}.tile.cloudmade.com/f6475b6206f54f9483a35e80bc29a974/' 
                    + style 
                    + '/256/{z}/{x}/{y}.png';
            },

            /* base layer functions */
            isBaseLayer: function(layer) {
                return layer === this.currentBaseLayer;
            },

            makeBaseLayers: function() {
                var baseLayerSettings = { minZoom: 2, maxZoom: 18, zIndex: 1 };

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
                }];
                /*
                return [{
                    name: 'OSM',
                    leafletLayer: new L.TileLayer(this.osmUrl(), baseLayerSettings)
                }, {
                    name: 'Pale',
                    leafletLayer: new L.TileLayer(this.cloudMadeUrl(998), baseLayerSettings)
                }, {
                    name: 'Gray',
                    leafletLayer: new L.TileLayer(this.cloudMadeUrl(48535), baseLayerSettings)
                }, {
                    name: 'TopOSM Relief',
                    leafletLayer: new L.TileLayer(this.topOsmUrl('toposm-color-relief', 'jpg'), baseLayerSettings)
                }];
                 */
            },

            setBaseLayer: function(layer) {
                if (this.currentBaseLayer) {
                    this.leafletMap.removeLayer(this.currentBaseLayer.leafletLayer);
                }
                this.currentBaseLayer = layer;
                this.leafletMap.addLayer(layer.leafletLayer);
                this.leafletMap.fire('baselayerchange', { layer: layer.leafletLayer });
            },

            /* normal layers */
            makeLayers: function() {
                return [{
                    on: false,
                    name: 'Contours',
                    leafletLayer: new L.TileLayer(this.topOsmUrl('toposm-contours', 'png'), {zIndex: 10})
                }, {
                    on: false,
                    name: 'Features',
                    leafletLayer: new L.TileLayer(this.topOsmUrl('toposm-features', 'png'), {zIndex: 11})
                }];
            },

            toggleLayer: function(layer) {
                if (layer.on) {
                    this.leafletMap.removeLayer(layer.leafletLayer);
                } else {
                    this.leafletMap.addLayer(layer.leafletLayer);
                }
                layer.on = !layer.on;
            }
        };

    }]);
