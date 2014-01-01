'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['Ecostem.directives', 'ngRoute']);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
}]);

Ecostem.controller('EcostemCtrl', ['$scope', function($scope) {
    $scope.waterModelLoaded = false;
    $scope.showElevation = false;
    $scope.elevationIsLoading = false;

    $scope.startSimulation = function() {
        $scope.map.removeControls();

        $scope.elevationIsLoading = true;
        $scope.showAsDiv = true;

        $scope.elevationSampler.loadElevationData($scope, function() {
            $scope.waterModelLoaded = true;
            $scope.elevationIsLoading = false;
        });

        /* maybe let the user draw water on the map */
    };

    $scope.stopSimulation = function() {
        $scope.showElevation = false;
        $scope.waterModelLoaded = false;
        $scope.showAsDiv = false;
        $scope.map.addControls();
    };
}]);
