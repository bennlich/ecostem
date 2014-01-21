'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

var elevationToDroplets;

Ecostem.controller('EcostemCtrl', ['$scope', 'map', function($scope, map) {
    /* Scenarios are fixed in a N-pixel wide frame and are dynamically
     * scaled when the map is moved/zoomed, using CSS transforms.
     */
    $scope.fixedScenarioWidth = 1024;

    $scope.waterModelLoaded = false;
    $scope.showElevation = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.startSimulation = function() {
        $scope.elevationIsLoading = true;
        $scope.showAsDiv = true;

        $scope.elevationSampler.loadElevationData($scope, function() {
            $scope.waterModelLoaded = true;
            $scope.elevationIsLoading = false;
        });
    };

    $scope.editDataLayer = function(layer) {
        console.log('edit data layer', layer);
    };

    $scope.stopSimulation = function() {
        $scope.showElevation = false;
        $scope.waterModelLoaded = false;
        $scope.showAsDiv = false;
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    // example use
    // var numMeters = 150;
    // numDroplets = transferFunc(numMeters);

}]);
