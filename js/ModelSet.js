'use strict';

define(['js/ElevationModel', 'js/FireSeverityModel', 'js/WaterModel', 'js/ErosionModel', 'js/VegetationModel'],
function(elevationModel, fireSeverityModel, waterModel, erosionModel, vegetationModel) {

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

        _makeModel: function(name, model, width, patchRenderer) {
            model.init(width, this._getHeight(width), this.virtualWidth, this);

            var tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer(model)),
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
                'Elevation'         : this._makeModel('Elevation', elevationModel, 1024, ElevationPatchRenderer),
                'Fire Severity'     : this._makeModel('Fire Severity', fireSeverityModel, 512, FirePatchRenderer),
                'Vegetation'        : this._makeModel('Vegetation', vegetationModel, 512, VegetationPatchRenderer),
                'Erosion & Deposit' : this._makeModel('Erosion & Deposit', erosionModel, 400, ErosionPatchRenderer),
                'Water Flow'        : this._makeModel('Water Flow', waterModel, 400, WaterPatchRenderer)
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

                toX = Math.floor(fromX / sampledModel.sampleSpacing),
                toY = Math.floor(fromY / sampledModel.sampleSpacing);

            return sampledModel.world[toX][toY];
        },

        samplePixel: function(x, y, sampledModel) {
            var bboxWidth = this.map.scenarioBBox.pixelWidth(),
                sampleSpacing = this.virtualWidth/bboxWidth,

                fromX = x * sampleSpacing,
                fromY = y * sampleSpacing,

                toX = Math.floor(fromX / sampledModel.sampleSpacing),
                toY = Math.floor(fromY / sampledModel.sampleSpacing);

            return sampledModel.world[toX][toY];
        },

        safeApply: function(fn) {
            this.scope.safeApply(fn);
        }
    };

    return ModelSet;

});
