'use strict';

function ModelSet(map, scope) {
    this.map = map;
    this.scope = scope;

    this.models = this._makeModels();

    this.crs = new LeafletCoordSystem(map.leafletMap);
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

    _makeModel: function(name, constructor, width, patchRenderer, bbox, opts) {
        var ratio = bbox.pixelHeight() / bbox.pixelWidth(),
            height = Math.floor(width * ratio);

        var model = new constructor(width, height, bbox, this),
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer(model)),
            tileServer = new ModelTileServer(tileRenderer);

        return _.extend({
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer
        }, opts);
    },

    _makeModels: function() {
        var bbox = this._createDefaultBBox();
        return {
            'Elevation'         : this._makeModel('Elevation', ElevationModel, 1024, ElevationPatchRenderer, bbox, {canPaint: false, editable:false}),
            'Fire Severity'     : this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer, bbox, {canPaint: true, editable: true}),
            'Vegetation'        : this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer, bbox, {canPaint: true, editable: true}),
            'Erosion & Deposit' : this._makeModel('Erosion & Deposit', ErosionModel, 400, ErosionPatchRenderer, bbox, {canPaint: false, editable: true}),
            'Water Flow'        : this._makeModel('Water Flow', WaterModel, 400, WaterPatchRenderer, bbox, {canPaint: true, editable: true})
        };
    },

    getModels: function() {
        return _.values(this.models);
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

