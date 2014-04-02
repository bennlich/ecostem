'use strict';

var map;

/* Leaflet wrapper */
EcostemServices.service('map', ['$location', '$rootScope', '$q', function($location, $rootScope, $q) {
    return {
        deferred: $q.defer(),
        init: function(id) {
            map = this;

            this.leafletMap = new L.Map(id,{ minZoom: 3, maxZoom: 15 });
            this.zIndex = 10;

            L.control.scale().addTo(this.leafletMap);

            // TODO smarter map centering
            this.leafletMap.setView(new L.LatLng(33.441351999999995, -105.73740000000001), 12);

            // base layers
            this.baseLayers = this._makeBaseLayers();
            this.setBaseLayer(this.baseLayers[3]);

            // masking layer
            this.leafletMap.addLayer(this._makeGrayLayer());

            // generic map overlays
            this.layers = this._makeLayers();

            // model layers
            this.modelLayers = this._makeModelLayers();

            this._handleBBoxUrl();

            this.deferred.resolve(this);
        },

        _handleBBoxUrl: function() {
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
            var baseLayerSettings = { 
                minZoom: 2, maxZoom: 18, 
                zIndex: 1, zoomAnimation: false 
            };

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
                leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-contours', 'png'), {zIndex: this.zIndex++})
            }, {
                on: false,
                name: 'Features',
                leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-features', 'png'), {zIndex: this.zIndex++})
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
        _makeModelLayers: function() {
            // TODO make modelSet a service?
            this.modelSet = new ModelSet(map, $rootScope);

            var layers = _.map(_.values(this.modelSet.models), function(model) {
                return {
                    name: model.name,
                    model: model,
                    on: false,
                    disabled: false,
                    editing: false,
                    leafletLayer: model.renderer.makeLayer({zIndex: this.zIndex++, opacity: 0.85})
                };
            }.bind(this));

            this.animator = new Animator(this.modelSet);

            return layers;
        },

        addDataLayer: function(obj) {
            this.modelSet.models[obj.name] = obj;
            this.modelLayers.push({
                name: obj.name,
                model: obj,
                on: false,
                disabled: false,
                editing: false,
                leafletLayer: obj.renderer.makeLayer({zIndex: this.zIndex++, opacity: 0.85})
            });
        },

        _makeGrayLayer:  function() {
            var opts = {zIndex: this.zIndex++, opacity: .3};
            var layer = L.tileLayer.canvas(opts);

            layer.drawTile = function(canvas, tilePoint, zoom) {
                var ctx = canvas.getContext('2d');

                ctx.fillStyle = 'rgb(20,20,20)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                var tileX = tilePoint.x * canvas.width;
                var tileY = tilePoint.y * canvas.height;

                var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);

                _.each(this.modelLayers, function(l) {
                    if (! this.leafletMap.hasLayer(l.leafletLayer))
                        return;

                    var modelRect = l.model.dataModel.geometry.toRect(zoom);
                    var i = canvasRect.intersect(modelRect);
                    
                    if (! i)
                        return;

                    var x = Math.round(i.left - canvasRect.left),
                        y = Math.round(i.top - canvasRect.top),
                        width = Math.round(i.width),
                        height = Math.round(i.height);

                    ctx.clearRect(x, y, width, height);
                }.bind(this));
            }.bind(this);

            this.leafletMap.on('layeradd', function() {
                layer.redraw();
            });

            this.leafletMap.on('layerremove', function() {
                layer.redraw();
            });

            return layer;
        }
    };
}]);

