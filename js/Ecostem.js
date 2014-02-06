'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets;

Ecostem.controller('EcostemCtrl', ['$scope', '$q', 'map', 'elevationSampler', function($scope, $q, map, elevationSampler) {
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

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
        var model = layer.model.dataModel;
        $scope.pauseSimulation(layer);
        model.reset();
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
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer = null;
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    $q.all([map.deferred.promise, elevationSampler.deferred.promise]).then(function() {
        $scope.elevationIsLoading = true;
        elevationSampler.loadElevationData(map.scenarioBBox, function() {
            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;
        });
    });

}]);
