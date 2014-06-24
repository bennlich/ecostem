
import {Rect} from '../st-api/Util/Rect';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';

export class Main {
    constructor(map) {
        this.map = map;

        this.modelPool = new ModelPool(map);
        this.animator = new Animator(this.modelPool);

        this.modelLayers = this._makeModelLayers();
        this.map.leafletMap.addLayer(this._makeGrayLayer());
    }

    /* editable data layers */
    _makeModelLayers() {
        var layers = [
            for (model of _.values(this.modelPool.models))
            {
                name: model.name,
                model: model,
                on: false,
                disabled: false,
                editing: false,
                leafletLayer: model.renderer.makeLayer({zIndex: this.map.zIndex++, opacity: 0.85})
            }
        ];
        return layers;
    }

    getModelLayer(name) {
        return _.find(this.modelLayers, (l) => l.name === name);
    }

    addModelLayer(obj) {
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
        var opts = {zIndex: this.map.zIndex++, opacity: 0.3};
        var layer = L.tileLayer.canvas(opts);

        layer.drawTile = (canvas, tilePoint, zoom) => {
            var ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgb(20,20,20)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            var tileX = tilePoint.x * canvas.width;
            var tileY = tilePoint.y * canvas.height;

            var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);

            for (var l of this.modelLayers) {
                if (! this.map.leafletMap.hasLayer(l.leafletLayer)) {
                    continue;
                }

                var modelRect = l.model.dataModel.geometry.toRect(zoom);
                var i = canvasRect.intersect(modelRect);

                if (! i) {
                    continue;
                }

                var x = Math.round(i.left - canvasRect.left),
                y = Math.round(i.top - canvasRect.top),
                width = Math.round(i.width),
                height = Math.round(i.height);

                ctx.clearRect(x, y, width, height);
            }
        };

        this.map.leafletMap.on('layeradd layerremove', () => layer.redraw());

        return layer;
    }
}
