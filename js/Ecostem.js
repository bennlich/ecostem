'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets;

Ecostem.controller('EcostemCtrl', ['$scope', 'map', 'elevationSampler', function($scope, map, elevationSampler) {
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.brushSizes = [40, 30, 20];
    $scope.selectedBrushSize = $scope.brushSizes[0];
    $scope.selectBrushSize = function(s) {
        $scope.selectedBrushSize = s;
    };

    $scope.startSimulation = function() {
        function start() {
            map.waterModel.start();
            $scope.simulationStarted = true;
        }

        if (! elevationSampler.hasData()) {
            $scope.elevationIsLoading = true;

            elevationSampler.loadElevationData($scope, function() {
                $scope.elevationIsLoading = false;
                $scope.elevationLoaded = true;

                map.waterModel.sampleElevation(elevationSampler);

                start();
            });
        } else {
            start();
        }
    };

    $scope.editedLayer = null;
    $scope.scaleValue = {};

    $scope.editDataLayer = function(layer) {
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
    
    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer = null;
    };

    $scope.resetSimulation = function() {
        $scope.stopSimulation();
        map.waterModel.reset();
    };

    $scope.stopSimulation = function() {
        $scope.simulationStarted = false;
        map.waterModel.stop();
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');
}]);
