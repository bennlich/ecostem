"use strict";

var Directives = angular.module('Directives', ['Services']);

/* Hides the splash screen when elevation is done loading. */
Directives.directive('splashScreen', [function() {
    return function(scope, element) {
        scope.$watch('elevationLoaded', function(val) {
            if (!!val)
                element.fadeOut();
        });
    };
}]);

/* This directive shows the main app pane when it's done loading. */
Directives.directive('mainContainer', [function() {
    return function(scope, element) {
        scope.$watch('elevationLoaded', function(val) {
            if (!!val) {
                /* Kind of a dirty fun trick to get the app to fade in
                   after loading. The container is kept with visibility:hidden
                   in the loading phase. While it's not visible, it still
                   has dimensions, so d3 and leaflet can initialize off-screen.
                   (As opposed to display:none which would cause both Leaflet
                   and d3 to not initialize correctly.) Then we hide it
                   (which does a display:none), change its visibility,
                   and fade it in (which again affects the 'display' property,
                   not the visibility). */
                element.hide().css('visibility','visible').fadeIn();
            }
        });
    };
}]);

Directives.directive('drawingSurface', [function() {
    return function(scope, element) {
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

Directives.directive('mapBody', ['mapSvc', function(mapSvc) {
    return function(scope, element, attrs) {
        mapSvc.init(attrs.id);
    };
}]);

Directives.directive('elevationCanvas', ['elevationSvc', function(elevationSvc) {
    return function(scope, element) {
        elevationSvc.init(element[0]);
    };
}]);

Directives.directive('checkedBaseLayer', ['mapSvc', function(mapSvc) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedBaseLayer);

        /* make sure currently selected base layer is checked */
        element.prop('checked', mapSvc.map.isBaseLayer(layer));

        /* when radio button changes, trigger layer change on underlying map */
        element.change(function() {
            mapSvc.map.setBaseLayer(layer);
        });
    };
}]);

Directives.directive('checkedLayer', ['mapSvc', function(mapSvc) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedLayer);
        console.log(layer);
        element.change(function() {
            mapSvc.map.toggleLayer(layer);
        });
    };
}]);
