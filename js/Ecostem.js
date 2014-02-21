'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets, curSlope, calculatedSlope, slopeDiff;

Ecostem.controller('EcostemCtrl', ['$scope', '$q', 'map', 'elevationSampler', function($scope, $q, map, elevationSampler) {
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.drawVegetation = function(vegType) {
        console.log('draw veg', vegType);

        var modelSet = map.modelSet,
            vegModel = modelSet.getModel('Vegetation'),
            dataModel = vegModel.dataModel,
            elevationModel = modelSet.getDataModel('Elevation'),
            tf = dataModel.tf[vegType];

        for (var i = 0; i < dataModel.xSize; ++i) {
            for (var j = 0; j < dataModel.ySize; ++j) {
                var elevationValue = modelSet.sample(i, j, dataModel, elevationModel).elevation;
                var density = tf(elevationValue) / 100;

                if (Math.random() <= density) {
                    dataModel.putData(i, j, 1, 1, {vegetation: vegType});
                }
            }
        }

        console.log(tf.controlPoints);

        vegModel.renderer.refreshLayer();
    };

    $scope.clearVegetation = function(vegType) {
        console.log('clear veg', vegType);

        var vegModel = map.modelSet.getModel('Vegetation'),
            vegDataModel = vegModel.dataModel,
            vegTypes = VegetationModel.vegTypes;

        for (var i = 0; i < vegDataModel.xSize; ++i) {
            for (var j = 0; j < vegDataModel.ySize; ++j) {
                if (vegDataModel.world[i][j].vegetation === vegType) {
                    vegDataModel.world[i][j].vegetation = vegTypes.NONE;
                }
            }
        }

        vegModel.renderer.refreshLayer();
    };

    $scope.brushSizes = [40, 30, 20, 10];
    $scope.selectedBrushSize = $scope.brushSizes[0];
    $scope.selectBrushSize = function(s) {
        $scope.selectedBrushSize = s;
    };

    $scope.startSimulation = function(layer) {
        var model = layer.model.dataModel;
        model.sampleElevation(elevationSampler);
        model.start();
    };

    $scope.resetSimulation = function(layer) {
        var model = layer.model;
        $scope.pauseSimulation(layer);
        model.dataModel.reset();
        model.dataModel.runCallbacks();
    };

    $scope.pauseSimulation = function(layer) {
        var model = layer.model.dataModel;
        $scope.simulationStarted = false;
        model.stop();
    };

    /*
     * Serving a layer.
     */

    $scope.serveTiles = function(layer) {
        $scope.serverLayer = layer;
        $scope.serverLayerName = layer.name;
        $scope.serverPopupIsOpen = true;
    };

    $scope.startServer = function() {
        if ($scope.serverLayerName && $scope.serverLayer) {
            $scope.serverLayer.model.server.start($scope.serverLayerName);
            $scope.initStartServer();
        } 
    };

    $scope.initStartServer = function() {
        $scope.serverLayer = null;
        $scope.serverLayerName = "";
        $scope.serverPopupIsOpen = false;
    };

    $scope.stopServingTiles = function(layer) {
        layer.model.server.stop();
    };

    $scope.initStartServer();

    /* 
     * Drawing on/editing layers.
     */

    $scope.editedLayer = null;
    $scope.scaleValue = {};

    // when clicking in the scenario box and we're editing,
    // put data on the map at that location
    $scope.drawAt = function(point) {
        if ($scope.editedLayer) {
            $scope.editedLayer.model.renderer.putData(point, $scope.selectedBrushSize, $scope.scaleValue.value);
        }
    };

    $scope.editDataLayer = function(layer) {
        var editedLayer = $scope.editedLayer;

        if ($scope.editedLayer) {
            $scope.doneEditingDataLayer();
        }

        // if clicking "Edit" on the currently edited layer,
        // just stop editing
        if (editedLayer === layer) {
            return;
        }

        if (!layer.on) {
            map.toggleLayer(layer);
        }

        layer.disabled = true;
        layer.editing = true;

        $scope.editedLayer = layer;
        $scope.scaleValue = layer.model.renderer.patchRenderer.scale[0];
        layer.model.dataModel.show();
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer.model.dataModel.hide();
        $scope.editedLayer = null;
    };

    $scope.toggleSlope = function() {
        if ($scope.showSlope) {
            $scope.showSlope = false;
        }
        else {
            var waterModel = $scope.map.dataLayers[2].model.dataModel;
            curSlope = waterModel.getSlope();
            calculatedSlope = waterModel.calculateSlope();
            
            var curSlopeImage = curSlope.toImage(),
                calculatedSlopeImage = calculatedSlope.toImage();


            var slopeDiffData = [];
            for (var i = 0; i < curSlope.data.length; i++) {
                slopeDiffData.push(curSlope.data[i] - calculatedSlope.data[i]);
            }
            slopeDiff = new ABM.DataSet(curSlopeImage.width, curSlopeImage.height, slopeDiffData);
            var slopeDiffImage = slopeDiff.toImage();

            var slopeCanvas1 = document.getElementById('slopeCanvas1'),
                slopeCanvas2 = document.getElementById('slopeCanvas2'),
                slopeCanvas3 = document.getElementById('slopeCanvas3');

            slopeCanvas1.width = slopeCanvas2.width = slopeCanvas3.width = 2*curSlopeImage.width;
            slopeCanvas1.height = slopeCanvas2.height = slopeCanvas3.height = 2*curSlopeImage.height;
            
            slopeCanvas1.getContext('2d').drawImage(curSlopeImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);
            slopeCanvas2.getContext('2d').drawImage(calculatedSlopeImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);
            slopeCanvas3.getContext('2d').drawImage(slopeDiffImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);

            $scope.showSlope = true;
        }
    };

    // elevationToDroplets = $scope.elevationToDroplets =
    //     new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    $q.all([map.deferred.promise, elevationSampler.deferred.promise]).then(function() {
        $scope.elevationIsLoading = true;
        elevationSampler.loadElevationData(map.scenarioBBox, function() {
            /* TODO: Maybe the sampler can be merged into ElevationModel */
            var elevationModel = map.modelSet.getDataModel('Elevation');
            elevationModel.loadElevation(elevationSampler);

            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;
        });
    });

}]);
