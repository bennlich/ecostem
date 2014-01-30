'use strict';

EcostemServices.service('water', ['$rootScope','map', 'elevationSampler', function($scope, map, elevationSampler) {
    return {
        init: function() {
            var patchSize = 4,
                height = map.scenarioBBox.pixelHeight(),
                width = map.scenarioBBox.pixelWidth(),

                divWidth = elevationSampler.fixedScenarioWidth,
                divHeight = height * (elevationSampler.fixedScenarioWidth / width),

                numX = Math.floor(divWidth / patchSize),
                numY = Math.floor(divHeight / patchSize);

            WaterModel.initialize(numX, numY, elevationSampler, 80);
            FireSeverityModel.initialize(numX, numY, elevationSampler);
        },

        model: WaterModel
    };
}]);
