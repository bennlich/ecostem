'use strict';

function ModelSet(map) {
    this.map = map;
    this.virtualWidth = 1024;
    this.models = this._makeModels();
}

ModelSet.prototype = {
    _makeModels: function() {
        var waterModel = new WaterModel(256, 160, this.virtualWidth, this),
            waterRenderer = new ModelTileRenderer(this.map, waterModel, WaterPatchRenderer),
            waterTileServer = new ModelTileServer(waterRenderer),

            fireModel = new FireSeverityModel(512, 320, this.virtualWidth, this),
            fireRenderer = new ModelTileRenderer(this.map, fireModel, FirePatchRenderer),
            fireTileServer = new ModelTileServer(fireRenderer),

            vegModel = new VegetationModel(512, 320, this.virtualWidth, this),
            vegRenderer = new ModelTileRenderer(this.map, vegModel, VegetationPatchRenderer),
            vegTileServer = new ModelTileServer(vegRenderer);

        return [{
            name: 'Fire Severity',
            dataModel: fireModel,
            renderer: fireRenderer,
            server: fireTileServer
        }, {
            name: 'Vegetation',
            dataModel: vegModel,
            renderer: vegRenderer,
            server: vegTileServer
        }, {
            name: 'Water Model',
            dataModel: waterModel,
            renderer: waterRenderer,
            server: waterTileServer
        }];
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

