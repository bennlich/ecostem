'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets;

Ecostem.controller('EcostemCtrl', ['$scope', 'map', 'water', 'elevationSampler', function($scope, map, water, elevationSampler) {
    $scope.waterModelLoaded = false;
    $scope.showElevation = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.startSimulation = function() {
        $scope.elevationIsLoading = true;

        elevationSampler.loadElevationData($scope, function() {
            $scope.waterModelLoaded = true;
            $scope.elevationIsLoading = false;

            water.start();
        });
    };

    $scope.editDataLayer = function(layer) {
        console.log('edit data layer', layer);
    };

    $scope.stopSimulation = function() {
        water.stop();

        $scope.showElevation = false;
        $scope.waterModelLoaded = false;
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    // example use
    // var numMeters = 150;
    // numDroplets = transferFunc(numMeters);

}]);
