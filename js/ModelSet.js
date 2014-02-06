'use strict';

function ModelSet(map) {
    this.map = map;
    this.virtualWidth = 1024;
    this.models = this._makeModels();
}

ModelSet.prototype = {
    _makeModels: function() {
        var waterModel = new WaterModel(256, 160, this.virtualWidth),
            waterRenderer = new ModelTileRenderer(this.map, waterModel, WaterPatchRenderer),
            waterTileServer = new ModelTileServer(waterRenderer),

            fireModel = new FireSeverityModel(512, 320, this.virtualWidth),
            fireRenderer = new ModelTileRenderer(this.map, fireModel, FirePatchRenderer),
            fireTileServer = new ModelTileServer(fireRenderer),

            vegModel = new VegetationModel(512, 320, this.virtualWidth),
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
    }
};

