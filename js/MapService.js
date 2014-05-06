"use strict";

import {ModelBBox} from './ModelingCore/ModelBBox';
import {Rect} from './Util/Rect';
import {ModelPool} from './ModelingCore/ModelPool';
import {Animator} from './ModelingCore/Animator';

/* Leaflet wrapper */
export var MapService = ['$location', '$rootScope', '$q', function($location, $rootScope, $q) {
    return {
        deferred: $q.defer(),
        init: function(id) {
            /* for debugging */
            window.map = this;

            this.leafletMap = new L.Map(id,{ minZoom: 3, maxZoom: 15 });
            this.zIndex = 10;

            L.control.scale().addTo(this.leafletMap);

            this._homeBBox = this._makeHomeBBox();

            if (!this._handleBBoxUrl()) {
                this.setHomeView();
            }

            // base layers
            this.baseLayers = this._makeBaseLayers();
            this.setBaseLayer(this.baseLayers[2]);

            // masking layer
            this.leafletMap.addLayer(this._makeGrayLayer());

            // generic map overlays
            this.layers = this._makeLayers();

            // model layers
            this.modelLayers = this._makeModelLayers(this._homeBBox);

            this.deferred.resolve(this);
        },

        setHomeView: function() {
            this.leafletMap.setView(this._homeBBox.bbox.getCenter(), 12);
        },

        _makeHomeBBox: function() {
            /* temp hack to handle "multiple scenarios" */
            var urlParams = $location.search(),
                room = urlParams.room;

            var bbox = room === 'ruidoso'
                ? this._createRuidosoBBox()
                : this._createTaosBBox();

            return bbox;
        },

        _handleBBoxUrl: function() {
            var handled = false;
            // set map bounds to bbox argument in url
            var urlParams = $location.search(),
                bounds = urlParams.bbox && urlParams.bbox.split(',');
            if (bounds && bounds.length === 4) {
                this.leafletMap.fitBounds([
                    [bounds[0], bounds[1]],
                    [bounds[2], bounds[3]]
                ]);
                handled = true;
            }

            // update map bounds in bbox argument of url
            this.leafletMap.on('moveend', function() {
                var bounds = this.getBounds();
                $rootScope.safeApply(function() {
                    $location.search('bbox', '{s},{w},{n},{e}'.namedFormat({
                        s : bounds.getSouth(),
                        w : bounds.getWest(),
                        n : bounds.getNorth(),
                        e : bounds.getEast()
                    }));
                });
            });

            return handled;
        },

        _createRuidosoBBox: function() {
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

        _createTaosBBox: function() {
            var south = 36.305124,
                west = -105.851524,
                north = 36.553087,
                east = -105.415564;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return new ModelBBox(bounds, this.leafletMap);
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

        _mapBoxUrl: function(style) {
            switch(style) {
                case 'ROADMAP':
                    return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi293in/{z}/{x}/{y}.png';
                case 'SATELLITE':
                    return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi1nejo/{z}/{x}/{y}.png';
                case 'TERRAIN':
                default:
                    return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi0c6k3/{z}/{x}/{y}.png';
            }
        },

        /* base layer functions */
        isBaseLayer: function(layer) {
            return layer === this.currentBaseLayer;
        },

        _makeBaseLayers: function() {
            var baseLayerSettings = {
                minZoom: 2,
                maxZoom: 18,
                zIndex: 1,
                zoomAnimation: false
            };

            return [{
                name: 'Roadmap',
                leafletLayer: new L.TileLayer(this._mapBoxUrl('ROADMAP'), baseLayerSettings)
            }, {
                name: 'Satellite',
                leafletLayer: new L.TileLayer(this._mapBoxUrl('SATELLITE'), baseLayerSettings)
            }, {
                name: 'Terrain',
                leafletLayer: new L.TileLayer(this._mapBoxUrl('TERRAIN'), baseLayerSettings)
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
        _makeModelLayers: function(bbox) {
            this.modelPool = new ModelPool(this, bbox, $rootScope);

            var layers = [
                for (model of _.values(this.modelPool.models))
                {
                    name: model.name,
                    model: model,
                    on: false,
                    disabled: false,
                    editing: false,
                    leafletLayer: model.renderer.makeLayer({zIndex: this.zIndex++, opacity: 0.85})
                }
            ];

            this.animator = new Animator(this.modelPool);

            return layers;
        },

        addDataLayer: function(obj) {
            this.modelPool.models[obj.name] = obj;
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
            var opts = {zIndex: this.zIndex++, opacity: 0.3};
            var layer = L.tileLayer.canvas(opts);

            layer.drawTile = (canvas, tilePoint, zoom) => {
                var ctx = canvas.getContext('2d');

                ctx.fillStyle = 'rgb(20,20,20)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                var tileX = tilePoint.x * canvas.width;
                var tileY = tilePoint.y * canvas.height;

                var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);

                _.each(this.modelLayers, (l) => {
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
                });
            };

            this.leafletMap.on('layeradd layerremove', () => layer.redraw());

            return layer;
        }
    };
}];
