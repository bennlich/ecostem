"use strict";

import {ModelBBox} from '../st-api/ModelingCore/ModelBBox';
import {Rect} from '../st-api/Util/Rect';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';

export class Leaflet {
    constructor(id, bbox) {
        /* for debugging */
        window.map = this;

        this.leafletMap = new L.Map(id,{ minZoom: 3, maxZoom: 15 });
        this.zIndex = 10;

        this._homeBBox = new ModelBBox(bbox, this.leafletMap);

        L.control.scale().addTo(this.leafletMap);
    }

    addLayers() {
        // base layers
        this.baseLayers = this._makeBaseLayers();
        this.setBaseLayer(this.baseLayers[2]);

        // masking layer
        this.leafletMap.addLayer(this._makeGrayLayer());

        // generic map overlays
        this.layers = this._makeLayers();

        // model layers
        this.modelLayers = this._makeModelLayers(this._homeBBox);
    }

    setHomeView() {
        if (this._homeBBox)
            this.leafletMap.setView(this._homeBBox.bbox.getCenter(), 12);
    }

    /* tile urls */
    _osmUrl() {
        return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    _topOsmUrl(style, ext) {
        return 'http://{s}.tile.stamen.com/' + style + '/{z}/{x}/{y}.' + ext;
    }

    _cloudMadeUrl(style) {
        return 'http://{s}.tile.cloudmade.com/f6475b6206f54f9483a35e80bc29a974/'
            + style
            + '/256/{z}/{x}/{y}.png';
    }

    _mapBoxUrl(style) {
        switch(style) {
        case 'ROADMAP':
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi293in/{z}/{x}/{y}.png';
        case 'SATELLITE':
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi1nejo/{z}/{x}/{y}.png';
        case 'TERRAIN':
        default:
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi0c6k3/{z}/{x}/{y}.png';
        }
    }

    /* base layer functions */
    isBaseLayer(layer) {
        return layer === this.currentBaseLayer;
    }

    _makeBaseLayers() {
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
    }

    setBaseLayer(layer) {
        if (this.currentBaseLayer) {
            this.leafletMap.removeLayer(this.currentBaseLayer.leafletLayer);
        }
        this.currentBaseLayer = layer;
        this.leafletMap.addLayer(layer.leafletLayer);
        this.leafletMap.fire('baselayerchange', { layer: layer.leafletLayer });
    }

    /* overlay layers */
    _makeLayers() {
        return [{
            on: false,
            name: 'Contours',
            leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-contours', 'png'), {zIndex: this.zIndex++})
        }, {
            on: false,
            name: 'Features',
            leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-features', 'png'), {zIndex: this.zIndex++})
        }];
    }

    toggleLayer(layer) {
        if (layer.on) {
            this.leafletMap.removeLayer(layer.leafletLayer);
        } else {
            this.leafletMap.addLayer(layer.leafletLayer);
        }
        layer.on = !layer.on;
    }

    /* editable data layers */
    _makeModelLayers(bbox) {
        this.modelPool = new ModelPool(this, bbox);

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
    }

    getModelLayer(name) {
        return _.find(this.modelLayers, (l) => l.name === name);
    }

    addDataLayer(obj) {
        this.modelPool.models[obj.name] = obj;
        this.modelLayers.push({
            name: obj.name,
            model: obj,
            on: false,
            disabled: false,
            editing: false,
            leafletLayer: obj.renderer.makeLayer({zIndex: this.zIndex++, opacity: 0.85})
        });
    }

    _makeGrayLayer() {
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
}
