'use strict';

EcostemDirectives.directive('mapBody', ['map', function(map) {
    return function(scope, element, attrs) {
        map.init(attrs.id);
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

        element.prop('checked', layer.on);

        element.change(function() {
            map.toggleLayer(layer);
        });
    };
}]);

EcostemDirectives.directive('checkedDataLayer', ['map', function(map) {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.checkedDataLayer);

        element.prop('checked', layer.on);

        element.change(function() {
            map.toggleDataLayer(layer);
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

EcostemDirectives.directive('waterModel', ['map', function(map) {
    return function(scope, element, attrs) {
        var patchSize = 4;

        scope.$watch('waterModelLoaded', function(value) {
            if (!!value) {
                console.log('running model');

                var height = map.scenarioBBox.pixelHeight(),
                    width = map.scenarioBBox.pixelWidth(),

                    /* The div is constructed with a fixed size. The water model runs 
                     * inside it. This div is dynamically scaled and translated to
                     * fit in the scenario bounding box on the map. 
                     */
                    divWidth = scope.fixedScenarioWidth,
                    divHeight = height * (scope.fixedScenarioWidth / width),

                    minX = 0, minY = 0,
                    maxX = Math.floor(divWidth / patchSize) - 1,
                    maxY = Math.floor(divHeight / patchSize) - 1;

                agentscript = WaterPatchesModel.initialize(attrs.id, scope.elevationSampler,
                                                           patchSize, minX, maxX, minY, maxY).debug().start();

                element.css('width', divWidth);
                element.css('height', divHeight);

                var widthRatio = scope.fixedScenarioWidth/width,
                    /* The x- and y-offsets for the CSS transform. The widthRatio 
                     * multiplication is necessary to account for the fact that 
                     * we're translating and scaling at the same time.
                     */
                    xTranslation = map.scenarioBBox.xOffsetFromTopLeft() * widthRatio,
                    yTranslation = map.scenarioBBox.yOffsetFromTopLeft() * widthRatio;

                element.css('transform-origin', '0 0');
                element.css('transform', 'scale({0},{0}) translate({1}px,{2}px)'.format(1/widthRatio, xTranslation, yTranslation));

                map.leafletMap.on('drag moveend', function() {
                    var width = map.scenarioBBox.pixelWidth(),
                        xt = map.scenarioBBox.xOffsetFromTopLeft() * 1024/width,
                        yt = map.scenarioBBox.yOffsetFromTopLeft() * 1024/width;

                    var transform = 'scale({0},{0}) translate({1}px,{2}px)'.format(width/scope.fixedScenarioWidth, xt, yt);
                    element.css('transform', transform);
                });

            }
            if (value === false && agentscript) {
                agentscript.stop();
                agentscript.reset();
                agentscript = null;
            }
        });

        /* The inspector is commented out for now because it doesn't work correctly under
         * scaling and translation.
         */

        /* Inspector implementation: */
        
        /* 
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
         */
    };
}]);
