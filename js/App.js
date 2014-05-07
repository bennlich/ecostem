"use strict";

/* This is the application entrypoint. The app is started simply by
   importing this module. */

/* modifies the String prototype with some useful methods */
import "../st-api/Util/StringUtil";
import {
    transferFunctionsMixin,
    sandScanMixin,
    sensorsMixin,
    rasterPaintingMixin,
    vegetationAutofillMixin,
    layerPublishingMixin
} from './AppMixins';
import './AppDirectives';
import './AppServices';

/* Leaflet "hack" that forces openPopup() to leave current popups open.
   This is used for sensors. We want multiple sensors to be opened together. */
L.Map = L.Map.extend({
    openPopup: function(popup) {
        this._popup = popup;

        return this.addLayer(popup).fire('popupopen', {
            popup: this._popup
        });
    }
});

/* Angular application */
var Ecostem = angular.module('Ecostem', ['Directives', 'Services']);

/* A few filters to be used in HTML */
Ecostem.filter('format', [function() {
    return function(input, p) {
        return Number(input).toFixed(p || 2);
    };
}]);

Ecostem.filter('timeformat', [function() {
    return function(input) {
        return input < 10 ? '0' + input : input;
    };
}]);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');

    $rootScope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if(phase === '$apply' || phase === '$digest') {
            if(fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
}]);

/* The only controller. Technically we could use multiple controllers --
   assign every HTML snippet to a different controller. In that case we
   would have to solve inter-controller communication, usually done
   through events. */
Ecostem.controller('EcostemCtrl', ['$scope', '$q', '$compile', '$http', 'mapSvc', 'elevationSvc', 'mainSvc',
                          function( $scope,   $q,   $compile,   $http,   mapSvc,   elevationSvc,   mainSvc)
{
    /* This is kind of the "main" function of ecostem. It only runs after the services have
       been loaded. This makes sure that the mixins can do initialization assuming that
       the map has been initialized and all the models and layers are in place. */
    $q.all([mapSvc.deferred.promise, elevationSvc.deferred.promise]).then(function() {
        mainSvc.init();

        window.sc = $scope;
        $scope.showElevation = false;
        $scope.elevationLoaded = false;
        $scope.elevationIsLoading = false;
        $scope.map = mapSvc.map;
        $scope.main = mainSvc.main;

        /* The main controller is broken up into "mixins", simply functions that
           attach functionality to the $scope. Their main purpose is for organization,
           to group related functions together and declutter the main controller. */
        console.log('here');
        /* Functionality related to editing transfer functions in the UX */
        transferFunctionsMixin($scope, mainSvc.main, mapSvc.map);
        /* 3D scanning for use with projector/camera interface on the sand table.
        Not yet in use. */
        sandScanMixin($scope, mainSvc.main, mapSvc.map);
        /* Managing sensors on the map. */
        sensorsMixin($scope, $compile, mainSvc.main, mapSvc.map);
        /* Painting functionality for models that support it. */
        rasterPaintingMixin($scope, mainSvc.main, mapSvc.map);
        /* Autofill/Clear buttons for vegetation transfer functions */
        vegetationAutofillMixin($scope, mainSvc.main);
        /* The "Publish" button; serving dynamic tiles for a layer through Firebase */
        layerPublishingMixin($scope);

        $scope.elevationIsLoading = true;

        var elevationModel = mainSvc.main.modelPool.getDataModel('Elevation');
        var waterModel = mainSvc.main.modelPool.getDataModel('Water Flow');

        /* load the elevation raster from the redfish elevation server */
        elevationSvc.loadElevationData(elevationModel.geometry, function() {
            /* When done loading, copy the elevation data into the Ecostem
               elevation model. */
            elevationModel.loadElevation(elevationSvc);
            /* Load elevation once and for all into the water model. We could
               alternately sample elevation dynamically, or cache on the fly. */
            waterModel.sampleElevation();

            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;

            /* Turn on the erosion and water layers by default */
            var erosionLayer = _.find(mainSvc.main.modelLayers, (l) => l.name === 'Erosion & Deposit');
            var waterLayer = _.find(mainSvc.main.modelLayers, (l) => l.name === 'Water Flow');

            mapSvc.map.toggleLayer(erosionLayer);
            mapSvc.map.toggleLayer(waterLayer);
        });
    });
}]);

/* Boot the application manually instead of using an ng-app attribute in
   index.html. Seems necessary when using Traceur because angular tries
   to boot the app before Traceur is done compiling. */
angular.element(document).ready(function() {
    angular.bootstrap(document, ['Ecostem']);
});
