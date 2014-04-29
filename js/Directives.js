
var Directives = angular.module('Directives', ['Services']);

Directives.directive('drawingSurface', ['map', function(map) {
    return function(scope, element, attrs) {
        function mouseHandler(e) {
            // var b = scope.editedLayer.model.dataModel.bbox,
            //     bx = b.xOffsetFromTopLeft(),
            //     by = b.yOffsetFromTopLeft(),
            //     bw = b.pixelWidth(),
            //     bh = b.pixelHeight(),

            //     x = e.clientX - bx,
            //     y = e.clientY - by;

            // if (x < 0 || x >= bw || y < 0 || y >= bh)
            //     return;

            // scope.drawAt({x:x,y:y});
            scope.drawAt({x: e.clientX, y: e.clientY});
        }

        element.drag('init', mouseHandler);
        element.drag(mouseHandler);
    };
}]);

Directives.directive('mapBody', ['map', function(map) {
    return function(scope, element, attrs) {
        map.init(attrs.id);
    };
}]);

Directives.directive('elevationCanvas', ['elevationSampler', function(elevationSampler) {
    return function(scope, element, attrs) {
        elevationSampler.init(element[0]);
    };
}]);

Directives.directive('checkedBaseLayer', ['map', function(map) {
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

Directives.directive('checkedLayer', ['map', function(map) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedLayer);

        element.change(function() {
            map.toggleLayer(layer);
        });
    };
}]);
