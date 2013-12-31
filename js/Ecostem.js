/* Angular application */

var Ecostem = angular.module('Ecostem', ['Ecostem.directives', 'ngRoute']);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('running');
}]);

Ecostem.controller('EcostemCtrl', ['$scope', function($scope) {
    $scope.startSimulation = function() {
        /* grab elevation image using map bbox:
         * http://70.90.201.217/cgi-bin/elevation.py?bbox=35.59,-106.9,36.20,-105.9&res=500,500
         * convert image to AS dataset somehow
         * maybe let the user draw water on the map
         * put AS in a canvas layer
         * run water simulation
         */
    };
}]);

var EcostemDirectives = angular.module('Ecostem.directives', []);

EcostemDirectives.directive('mapBody', [function() {
    return function(scope, element, attrs) {
        scope.map = new Map(attrs.id);
    };
}]);

EcostemDirectives.directive('checkedBaseLayer', [function() {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedBaseLayer);

        /* make sure currently selected base layer is checked */
        if (scope.map.isBaseLayer(layer)) {
            element.prop('checked',true);
        }

        /* when radio button changes, trigger layer change on underlying map */
        element.change(function() {
            scope.map.setBaseLayer(layer);
        });
    };
}]);
