'use strict';

function ModelSet(map, scope) {
    this.map = map;
    this.scope = scope;

    this.models = this._makeModels();

    this.crs = new GlobalCRS(map.leafletMap);
}

ModelSet.prototype = {
    _createDefaultBBox: function() {
        var south = 33.357555,
            west = -105.890007,
            north = 33.525149,
            east = -105.584793;

        var bounds = L.latLngBounds(
            new L.LatLng(south, west),
            new L.LatLng(north, east)
        );

        return new ModelBBox(bounds, this.map.leafletMap);
    },

    _makeModel: function(name, constructor, width, patchRenderer, bbox) {
        var ratio = bbox.pixelHeight() / bbox.pixelWidth(),
            height = Math.floor(width * ratio);

        var model = new constructor(width, height, bbox, this),
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
        var bbox = this._createDefaultBBox();
        return {
            'Elevation'         : this._makeModel('Elevation', ElevationModel, 1024, ElevationPatchRenderer, bbox),
            'Fire Severity'     : this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer, bbox),
            'Vegetation'        : this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer, bbox),
            'Erosion & Deposit' : this._makeModel('Erosion & Deposit', ErosionModel, 400, ErosionPatchRenderer, bbox),
            'Water Flow'        : this._makeModel('Water Flow', WaterModel, 400, WaterPatchRenderer, bbox)
        };
    },

    getModel: function(name) {
        return this.models[name];
    },

    getDataModel: function(name) {
        var model = this.getModel(name);

        return model ? model.dataModel : null;
    },

    safeApply: function(fn) {
        this.scope.safeApply(fn);
    }
};

