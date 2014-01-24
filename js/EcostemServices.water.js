'use strict';

EcostemServices.service('water', ['$rootScope','map', 'elevationSampler', function($scope, map, elevationSampler) {
    return {
        start: function() {
            var patchSize = 4;
            var height = map.scenarioBBox.pixelHeight(),
                width = map.scenarioBBox.pixelWidth(),

                /* The div is constructed with a fixed size. The water model runs 
                 * inside it. This div is dynamically scaled and translated to
                 * fit in the scenario bounding box on the map. 
                 */
                divWidth = elevationSampler.fixedScenarioWidth,
                divHeight = height * (elevationSampler.fixedScenarioWidth / width),

                numX = Math.floor(divWidth / patchSize),
                numY = Math.floor(divHeight / patchSize);

            WaterModel.initialize(numX, numY, elevationSampler);
            WaterModel.start();

            var waterLayer = _.find(map.modelLayers, function(layer) {
                return layer.name === 'Water Model';
            });

            waterLayer.disabled = false;
            map.toggleLayer(waterLayer);
        },

        stop: function() {
            WaterModel.stop();

            var waterLayer = _.find(map.modelLayers, function(layer) {
                return layer.name === 'Water Model';
            });

            waterLayer.disabled = true;

            if (waterLayer.on) {
                map.toggleLayer(waterLayer);
            }
        }
    };
}]);
