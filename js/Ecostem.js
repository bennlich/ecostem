'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets;

Ecostem.controller('EcostemCtrl', ['$scope', 'map', 'elevationSampler', '$timeout', function($scope, map, elevationSampler, $timeout) {
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
        var model = layer.tileRenderer.model;
        model.sampleElevation(elevationSampler);
        model.start();
    };

    $scope.resetSimulation = function(layer) {
        var model = layer.tileRenderer.model;
        $scope.pauseSimulation(layer);
        model.reset();
    };

    $scope.pauseSimulation = function(layer) {
        var model = layer.tileRenderer.model;
        $scope.simulationStarted = false;
        model.stop();
    };

    $scope.editedLayer = null;
    $scope.scaleValue = {};

    $scope.editDataLayer = function(layer) {
        if ($scope.editedLayer) {
            $scope.doneEditingDataLayer();
        }

        if (!layer.on) {
            map.toggleLayer(layer);
        }

        layer.disabled = true;
        layer.editing = true;

        $scope.editedLayer = layer;
        $scope.scaleValue = layer.tileRenderer.patchRenderer.scale[0];
    };

    map.onBBoxClick(function(point) {
        if ($scope.editedLayer) {
            $scope.editedLayer.tileRenderer.putData(point, $scope.selectedBrushSize, $scope.scaleValue.value);
        }
    });

    $timeout(function() {
        $scope.elevationIsLoading = true;
        elevationSampler.loadElevationData($scope, function() {
            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;
        });
    },1000);
    
    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer = null;
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');
}]);
