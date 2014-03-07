'use strict';

function ModelSet(map, ratio, scope) {
    this.map = map;
    this.virtualWidth = 1024;
    this.ratio = ratio;
    this.scope = scope;

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
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer(model)),
            tileServer = new ModelTileServer(tileRenderer);

        return {
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer
        };
    },

    _makeModels: function() {
        return {
            'Elevation'         : this._makeModel('Elevation', ElevationModel, 1024, ElevationPatchRenderer),
            'Fire Severity'     : this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer),
            'Vegetation'        : this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer),
            'Erosion & Deposit' : this._makeModel('Erosion & Deposit', ErosionModel, 400, ErosionPatchRenderer),
            'Water Flow'        : this._makeModel('Water Flow', WaterModel, 400, WaterPatchRenderer)
        };
    },

    getModel: function(name) {
        return this.models[name];
    },

    getDataModel: function(name) {
        var model = this.getModel(name);

        return model ? model.dataModel : null;
    },

    sample: function(x, y, fromModel, sampledModel) {
        var fromX = x * fromModel.sampleSpacing,
            fromY = y * fromModel.sampleSpacing,

            toX = Math.floor(fromX / sampledModel.sampleSpacing + sampledModel.sampleSpacing/2),
            toY = Math.floor(fromY / sampledModel.sampleSpacing + sampledModel.sampleSpacing/2);

        return sampledModel.world[toX][toY];
    },

    samplePixel: function(x, y, sampledModel) {
        var bboxWidth = this.map.scenarioBBox.pixelWidth(),
            sampleSpacing = this.virtualWidth/bboxWidth,

            fromX = x * sampleSpacing,
            fromY = y * sampleSpacing,

            toX = Math.floor(fromX / sampledModel.sampleSpacing + sampledModel.sampleSpacing/2),
            toY = Math.floor(fromY / sampledModel.sampleSpacing + sampledModel.sampleSpacing/2);

        return sampledModel.world[toX][toY];
    },

    safeApply: function(fn) {
        this.scope.safeApply(fn);
    }
};

