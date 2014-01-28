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
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;
    $scope.map = map;

    $scope.startSimulation = function() {
        function start() {
            water.model.start();
            $scope.simulationStarted = true;
        }

        if (! elevationSampler.hasData()) {
            $scope.elevationIsLoading = true;

            elevationSampler.loadElevationData($scope, function() {
                $scope.elevationIsLoading = false;
                $scope.elevationLoaded = true;

                water.model.sampleElevation();

                start();
            });
        } else {
            start();
        }
    };

    $scope.editDataLayer = function(layer) {
        console.log('edit data layer', layer);
    };

    $scope.resetSimulation = function() {
        $scope.stopSimulation();
        water.model.reset();
    };

    $scope.stopSimulation = function() {
        $scope.simulationStarted = false;
        water.model.stop();
    };

    elevationToDroplets = $scope.elevationToDroplets =
        new TransferFunction([0, 200], 'm', [0, 400], 'droplets / m^2', 'Rainfall vs. elevation');

    // example use
    // var numMeters = 150;
    // numDroplets = transferFunc(numMeters);

}]);
