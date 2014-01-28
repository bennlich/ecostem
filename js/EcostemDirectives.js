'use strict';

EcostemDirectives.directive('mapBody', ['map', 'water', function(map, water) {
    return function(scope, element, attrs) {
        map.init(attrs.id);
        console.log('map init');
        water.init();
        console.log('water');
    };
}]);

EcostemDirectives.directive('elevationCanvas', ['elevationSampler', function(elevationSampler) {
    return function(scope, element, attrs) {
        elevationSampler.init(element[0]);
    };
}]);

EcostemDirectives.directive('checkedBaseLayer', ['map', function(map) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedBaseLayer);

        /* make sure currently selected base layer is checked */
        element.prop('checked', map.isBaseLayer(layer));

        /* when radio button changes, trigger layer change on underlying map */
        element.change(function() {
            map.setBaseLayer(layer);
        });
    };
}]);

EcostemDirectives.directive('checkedLayer', ['map', function(map) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedLayer);

        element.change(function() {
            map.toggleLayer(layer);
        });
    };
}]);

