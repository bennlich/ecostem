'use strict';

var EcostemDirectives = angular.module('Ecostem.directives', []);
/* for debugging */
var map;

EcostemDirectives.directive('mapBody', ['$location', function($location) {
    return function(scope, element, attrs) {
        scope.map = map = new Map(attrs.id);

        // TODO: Probably move this to the Map service?
        var urlParams = $location.search(),
            bounds = urlParams.bbox && urlParams.bbox.split(',');

        if (bounds.length == 4) {
            map.leafletMap.fitBounds([
                [bounds[0], bounds[1]],
                [bounds[2], bounds[3]]
            ]);
        }
        
        var queryString = '?bbox={s},{w},{n},{e}';
        map.leafletMap.on('moveend', function() {
            var bounds = this.getBounds();
            scope.$apply(function() {
                $location.url(queryString.namedFormat({
                    s : bounds.getSouth(),
                    w : bounds.getWest(),
                    n : bounds.getNorth(),
                    e : bounds.getEast()
                }));
            });
        });
    };
}]);

EcostemDirectives.directive('checkedBaseLayer', [function() {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedBaseLayer);

        /* make sure currently selected base layer is checked */
        element.prop('checked', scope.map.isBaseLayer(layer));

        /* when radio button changes, trigger layer change on underlying map */
        element.change(function() {
            scope.map.setBaseLayer(layer);
        });
    };
}]);

EcostemDirectives.directive('checkedLayer', [function() {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedLayer);

        element.prop('checked', layer.on);

        element.change(function() {
            scope.map.toggleLayer(layer);
        });
    };
}]);

EcostemDirectives.directive('elevationCanvas', [function() {
    return function(scope, element, attrs) {
        scope.elevationSampler = new ElevationSampler(element[0]);
    };
}]);

/* for debugging */
var agentscript = null;

EcostemDirectives.directive('waterModel', [function() {
    return function(scope, element, attrs) {
        var patchSize = 4;

        scope.$watch('waterModelLoaded', function(value) {
            if (!!value) {
                console.log('running model');
                var patchSize = 4;
                var minX = 0;
                var minY = 0;
                var maxX = Math.floor($(window).width() / patchSize) - 1;
                var maxY = Math.floor($(window).height() / patchSize) - 1;

                agentscript = WaterPatchesModel.initialize(attrs.id, scope.elevationSampler,
                                                           patchSize, minX, maxX, minY, maxY).debug().start();
            }
            if (value === false && agentscript) {
                agentscript.stop();
                agentscript.reset();
                agentscript = null;
            }
        });

        /* Inspector implementation: */

        $('.popup').hide();
        $('.rect').css('width', patchSize)
                  .css('height', patchSize)
                  .hide()
                  .click(updatePatch);

        var currentPatch = null;
        function updatePatch() {
            var patch = currentPatch;

            var patchCoords = agentscript.patches.patchXYtoPixelXY(patch.x, patch.y),
                patchTop = patchCoords[1] - patchSize/2,
                patchLeft = patchCoords[0] - patchSize/2;

            $('.rect').css('top', patchTop)
                .css('left', patchLeft)
                .show();

            $('.popup').html('x: ' + patch.x + '<br/>'
                             + 'y: ' + patch.y + '<br/>'
                             + 'volume: ' + patch.volume + '<br/>'
                             + 'elevation: ' + patch.elevation + '<br/>'
                             + 'color: ' + patch.color + '<br/>')
                .css('top', patchTop + patchSize)
                .css('left', patchLeft + patchSize)
                .show();
        }

        element.click(function(evt) {
            if (!agentscript)
                return;

            var patchXY = agentscript.patches.pixelXYtoPatchXY(evt.offsetX, evt.offsetY),
                patch = agentscript.patches.patch(patchXY[0], patchXY[1]);

            currentPatch = patch;
            updatePatch();
        });

        element.mousemove(function() {
            $('.popup').hide();
            $('.rect').hide();
        });
    };
}]);
