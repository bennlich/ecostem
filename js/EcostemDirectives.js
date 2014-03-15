'use strict';

EcostemDirectives.directive('drawingSurface', ['map', function(map) {
    return function(scope, element, attrs) {
        function mouseHandler(e) {
            var b = map.modelBBox,
                bx = b.xOffsetFromTopLeft(),
                by = b.yOffsetFromTopLeft(),
                bw = b.pixelWidth(),
                bh = b.pixelHeight(),

                x = e.clientX - bx,
                y = e.clientY - by;

            if (x < 0 || x >= bw || y < 0 || y >= bh)
                return;

            scope.drawAt({x:x,y:y});
        }

        element.drag('init', mouseHandler);
        element.drag(mouseHandler);
    };
}]);

EcostemDirectives.directive('mapBody', ['map', function(map) {
    return function(scope, element, attrs) {
        map.init(attrs.id);
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

