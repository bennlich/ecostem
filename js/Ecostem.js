'use strict';

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);
var EcostemFilters = angular.module('EcostemFilters', []);

Ecostem.filter('format', [function() {
    return function(input) {
        return Number(input).toFixed(2);
    };
}]);

Ecostem.run(['$rootScope', function($rootScope) {
    console.log('Ecostem is running.');
    
    $rootScope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };
    
}]);

var curSlope, calculatedSlope, slopeDiff;

Ecostem.controller('EcostemCtrl', ['$scope', '$q', '$compile', 'map', 'elevationSampler', 
                          function( $scope,   $q,   $compile,   map,   elevationSampler) 
{
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;

    $scope.addingSensor = false;
    $scope.sensorId = 0;
    $scope.sensors = {};

    $scope.map = map;

    function addSensor(e) {
        var marker = L.marker(e.latlng);

        marker.addTo(map.leafletMap);
        map.scenarioPolygon.off('click', addSensor);

        var bbox_x = map.scenarioBBox.xOffsetFromTopLeft();
        var bbox_y = map.scenarioBBox.yOffsetFromTopLeft();

        $scope.$apply(function() {
            $scope.addingSensor = false;

            var x = e.containerPoint.x - bbox_x,
                y = e.containerPoint.y - bbox_y;

            var elev = map.modelSet.models['Elevation'].dataModel;
            var water = map.modelSet.models['Water Flow'].dataModel;
            var veg = map.modelSet.models['Vegetation'].dataModel;
            var sev = map.modelSet.models['Fire Severity'].dataModel;

            var elevData = map.modelSet.samplePixel(x, y, elev);
            var waterData = map.modelSet.samplePixel(x, y, water);
            var vegData = map.modelSet.samplePixel(x, y, veg);
            var sevData = map.modelSet.samplePixel(x, y, sev);

            var sensor = {
                elevData : elevData,
                waterData : waterData,
                vegData : vegData,
                sevData : sevData
            };

            var id = $scope.sensorId++;
            $scope.sensors[id] = sensor;

            var html = ('<div>Elevation: {{sensors[{0}].elevData.elevation | format}}<br/>'
                     + 'Fire Severity: {{fireTypeToString(sensors[{0}].sevData.severity)}}<br/>'
                     + 'Vegetation: {{vegTypeToString(sensors[{0}].vegData.vegetation)}}<br/>'
                     + '<hr/>'
                     + 'Water Volume: {{sensors[{0}].waterData.volume | format}}<br/>'
                     + 'Floating Silt: {{sensors[{0}].waterData.siltFloating | format}}<br/>'
                     + 'Deposited Silt: {{sensors[{0}].waterData.siltDeposit | format}}</div>').format(id);

            var compiledHtml = $compile(html)($scope);

            var popup = L.popup({maxWidth: 160, minWidth: 160}).setContent(compiledHtml[0]);

            marker.bindPopup(popup).update().openPopup();
        });     
    }

    $scope.fireTypeToString = FireSeverityModel.typeToString;
    $scope.vegTypeToString = VegetationModel.typeToString;

    $scope.addSensor = function() {
        if ($scope.addingSensor) {
            $scope.addingSensor = false;
            return;
        }

        $scope.addingSensor = true;
        map.scenarioPolygon.on('click', addSensor);
    };

    $scope.cancelAddingSensor = function() {
        $scope.addingSensor = false;
    };

    $scope.drawVegetation = function(vegType) {
        console.log('draw veg', vegType);

        var modelSet = map.modelSet,
            vegModel = modelSet.getModel('Vegetation'),
            dataModel = vegModel.dataModel,
            elevationModel = modelSet.getDataModel('Elevation'),
            tf = dataModel.controls[vegType];

        for (var i = 0; i < dataModel.xSize; ++i) {
            for (var j = 0; j < dataModel.ySize; ++j) {
                var elevationValue = modelSet.sample(i, j, dataModel, elevationModel).elevation;
                var density = tf(elevationValue) / 100;

                if (Math.random() <= density) {
                    dataModel.putData(i, j, 1, 1, {vegetation: vegType});
                }
            }
        }

        console.log(tf.controlPoints);

        vegModel.renderer.refreshLayer();
    };

    $scope.clearVegetation = function(vegType) {
        console.log('clear veg', vegType);

        var vegModel = map.modelSet.getModel('Vegetation'),
            vegDataModel = vegModel.dataModel,
            vegTypes = VegetationModel.vegTypes;

        for (var i = 0; i < vegDataModel.xSize; ++i) {
            for (var j = 0; j < vegDataModel.ySize; ++j) {
                if (vegDataModel.world[i][j].vegetation === vegType) {
                    vegDataModel.world[i][j].vegetation = vegTypes.NONE;
                }
            }
        }

        vegModel.renderer.refreshLayer();
    };

    $scope.brushSizes = [40, 30, 20, 10];
    $scope.selectedBrushSize = $scope.brushSizes[0];
    $scope.selectBrushSize = function(s) {
        $scope.selectedBrushSize = s;
    };

    $scope.startSimulation = function(layer) {
        var model = layer.model.dataModel;
        model.start();
    };

    $scope.resetSimulation = function(layer) {
        var model = layer.model;
        $scope.pauseSimulation(layer);
        model.dataModel.reset();
        model.dataModel.runCallbacks();
    };

    $scope.pauseSimulation = function(layer) {
        var model = layer.model.dataModel;
        $scope.simulationStarted = false;
        model.stop();
    };

    /*
     * Serving a layer.
     */

    $scope.serveTiles = function(layer) {
        $scope.serverLayer = layer;
        $scope.serverLayerName = layer.name;
        $scope.serverPopupIsOpen = true;
    };

    $scope.startServer = function() {
        if ($scope.serverLayerName && $scope.serverLayer) {
            $scope.serverLayer.model.server.start($scope.serverLayerName);
            $scope.initStartServer();
        } 
    };

    $scope.initStartServer = function() {
        $scope.serverLayer = null;
        $scope.serverLayerName = "";
        $scope.serverPopupIsOpen = false;
    };

    $scope.stopServingTiles = function(layer) {
        layer.model.server.stop();
    };

    $scope.initStartServer();

    /* 
     * Drawing on/editing layers.
     */

    $scope.editedLayer = null;
    $scope.scaleValue = {};

    // when clicking in the scenario box and we're editing,
    // put data on the map at that location
    $scope.drawAt = function(point) {
        if ($scope.editedLayer) {
            $scope.editedLayer.model.renderer.putData(point, $scope.selectedBrushSize, $scope.scaleValue.value);
        }
    };

    $scope.editDataLayer = function(layer) {
        var editedLayer = $scope.editedLayer;

        if ($scope.editedLayer) {
            $scope.doneEditingDataLayer();
        }

        // if clicking "Edit" on the currently edited layer,
        // just stop editing
        if (editedLayer === layer) {
            return;
        }

        if (!layer.on) {
            map.toggleLayer(layer);
        }

        layer.disabled = true;
        layer.editing = true;

        $scope.editedLayer = layer;
        $scope.scaleValue = layer.model.renderer.patchRenderer.scale[0];
        layer.model.dataModel.show();
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer.model.dataModel.hide();
        $scope.editedLayer = null;
    };

    $scope.toggleSlope = function() {
        if ($scope.showSlope) {
            $scope.showSlope = false;
        }
        else {
            var waterModel = $scope.map.dataLayers[2].model.dataModel;
            curSlope = waterModel.getSlope();
            calculatedSlope = waterModel.calculateSlope();
            
            var curSlopeImage = curSlope.toImage(),
                calculatedSlopeImage = calculatedSlope.toImage();


            var slopeDiffData = [];
            for (var i = 0; i < curSlope.data.length; i++) {
                slopeDiffData.push(curSlope.data[i] - calculatedSlope.data[i]);
            }
            slopeDiff = new ABM.DataSet(curSlopeImage.width, curSlopeImage.height, slopeDiffData);
            var slopeDiffImage = slopeDiff.toImage();

            var slopeCanvas1 = document.getElementById('slopeCanvas1'),
                slopeCanvas2 = document.getElementById('slopeCanvas2'),
                slopeCanvas3 = document.getElementById('slopeCanvas3');

            slopeCanvas1.width = slopeCanvas2.width = slopeCanvas3.width = 2*curSlopeImage.width;
            slopeCanvas1.height = slopeCanvas2.height = slopeCanvas3.height = 2*curSlopeImage.height;
            
            slopeCanvas1.getContext('2d').drawImage(curSlopeImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);
            slopeCanvas2.getContext('2d').drawImage(calculatedSlopeImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);
            slopeCanvas3.getContext('2d').drawImage(slopeDiffImage, 0, 0, slopeCanvas1.width, slopeCanvas1.height);

            $scope.showSlope = true;
        }
    };

    $q.all([map.deferred.promise, elevationSampler.deferred.promise]).then(function() {
        $scope.elevationIsLoading = true;
        elevationSampler.loadElevationData(map.scenarioBBox, function() {
            /* TODO: Maybe the sampler can be merged into ElevationModel */
            var elevationModel = map.modelSet.getDataModel('Elevation');
            var waterModel = map.modelSet.getDataModel('Water Flow');

            elevationModel.loadElevation(elevationSampler);
            console.log('here');
            waterModel.sampleElevation();

            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;
        });
    });

}]);
