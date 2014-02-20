'use strict';

function ModelSet(map, ratio) {
    this.map = map;
    this.virtualWidth = 1024;
    this.ratio = ratio;
    this.models = this._makeModels();
}

ModelSet.prototype = {
    _getHeight: function(w) {
        var h = Math.floor(w * this.ratio);
        console.log(h, w, this.ratio);
        return h;
    },

    _makeModel: function(name, constructor, width, patchRenderer) {
        var model = new constructor(width, this._getHeight(width), this.virtualWidth, this),
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer),
            tileServer = new ModelTileServer(tileRenderer);

        return {
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer
        };
    },

    _makeModels: function() {
        return [
            this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer),
            this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer),
            this._makeModel('Water Flow', WaterModel, 256, WaterPatchRenderer)
        ];
    },

    getDataModel: function(name) {
        var model = _.find(this.models, function(model) {
            return model.name === name;
        });

        return model.dataModel;
    },

    sample: function(x, y, fromModel, sampledModel) {
        var fromX = x * fromModel.sampleSpacing,
            fromY = y * fromModel.sampleSpacing,

            toX = Math.floor(fromX / sampledModel.sampleSpacing),
            toY = Math.floor(fromY / sampledModel.sampleSpacing);

        /* TODO this is very crude sampling */
        return sampledModel.world[toX][toY];
    }
};

