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
    $scope.waterModelLoaded = false;
    $scope.showElevation = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.startSimulation = function() {
        map.removeControls();

        $scope.elevationIsLoading = true;
        $scope.showAsDiv = true;

        $scope.elevationSampler.loadElevationData($scope, function() {
            $scope.waterModelLoaded = true;
            $scope.elevationIsLoading = false;
        });

        /* maybe let the user draw water on the map */
    };

    $scope.editDataLayer = function(layer) {
        console.log('edit data layer', layer);
    };

    $scope.stopSimulation = function() {
        $scope.showElevation = false;
        $scope.waterModelLoaded = false;
        $scope.showAsDiv = false;
        map.addControls();
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    // example use
    // var numMeters = 150;
    // numDroplets = transferFunc(numMeters);

}]);
