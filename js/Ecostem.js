'use strict';

/* leaflet "hack" that forces openPopup() to leave current popups open */
L.Map = L.Map.extend({
    openPopup: function(popup) {
        this._popup = popup;

        return this.addLayer(popup).fire('popupopen', {
            popup: this._popup
        });
    }
});

/* Angular application */

var Ecostem = angular.module('Ecostem', ['EcostemDirectives', 'EcostemServices']);
var EcostemDirectives = angular.module('EcostemDirectives', ['EcostemServices']);
var EcostemServices = angular.module('EcostemServices', []);

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

    TransferFunctions.init();
    
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
var sc;

Ecostem.controller('EcostemCtrl', ['$scope', '$q', '$compile', '$http', 'map', 'elevationSampler', 
                          function( $scope,   $q,   $compile,   $http,   map,   elevationSampler) 
{
    sc = $scope;
    $scope.simulationStarted = false;
    $scope.showElevation = false;
    $scope.elevationLoaded = false;
    $scope.elevationIsLoading = false;

    $scope.addingSensor = false;
    $scope.sensorId = 0;
    $scope.sensors = {};

    $scope.map = map;

    /* This code is a start at putting ASC grid files on the map
       -- in particular acequia data for NNMC. It seems to work
       except the acequia data we have seems to be in a different
       projection. */

    /*
    $http.get('data/acequiaData/hydrology.txt')
        .success(function(data) {
            var p = 5;
            var parser = new AscParser();

            parser.parse(data, function() {
                console.log('progress: ', p + '%');
                p += 5;
            });

            var h = parser.headers;
            var width = h.cellsize * h.ncols;
            var height = h.cellsize * h.nrows;

            var southWest = new L.LatLng(h.yllcorner, h.xllcorner);
            var northEast = new L.LatLng(h.yllcorner+height, h.xllcorner+width);
            var box = new L.LatLngBounds(southWest, northEast);
            console.log(box);
            var modelBBox = new ModelBBox(box, map.leafletMap);

            var model = new GenericModel(h.ncols, h.nrows, modelBBox, map.modelSet.virtualWidth, map.modelSet);
            model.setWorld(parser.data);
            var tileRenderer = new ModelTileRenderer(map, model, GenericPatchRenderer(model));
            var tileServer = new ModelTileServer(tileRenderer);

            var obj = {
                name: 'Acequias',
                dataModel: model,
                renderer: tileRenderer,
                server: tileServer
            };

            map.addDataLayer(obj);
        })
        .error(function() {
            console.log('asc download fail');
        });
     */

    function addSensor(e) {
        var marker = L.marker(e.latlng);

        marker.addTo(map.leafletMap);
        map.leafletMap.off('click', addSensor);

        $scope.$apply(function() {
            $scope.addingSensor = false;

            var elev = map.modelSet.models['Elevation'].dataModel;
            var water = map.modelSet.models['Water Flow'].dataModel;
            var veg = map.modelSet.models['Vegetation'].dataModel;
            var sev = map.modelSet.models['Fire Severity'].dataModel;
            var point = e.latlng;

            var elevData = elev.sample(point),
                waterData = water.sample(point),
                vegData = veg.sample(point),
                sevData = sev.sample(point);

            var sensor = {
                elevData : elevData,
                waterData : waterData,
                vegData : vegData,
                sevData : sevData,
                marker : marker,
                latlng : e.latlng
            };

            var id = $scope.sensorId++;
            $scope.sensors[id] = sensor;

            var html = ('<div>Lat: {{sensors[{0}].latlng.lat | format:6}}<br/>'
                        + 'Lng: {{sensors[{0}].latlng.lng | format:6}}<br/>'
                        + '<hr/>'
                        + 'Elevation: {{sensors[{0}].elevData.elevation | format}}<br/>'
                        + 'Fire Severity: {{fireTypeToString(sensors[{0}].sevData.severity)}}<br/>'
                        + 'Vegetation: {{vegTypeToString(sensors[{0}].vegData.vegetation)}}<br/>'
                        + '<hr/>'
                        + 'Water Volume: {{sensors[{0}].waterData.volume | format}}<br/>'
                        + 'Floating Silt: {{sensors[{0}].waterData.siltFloating | format}}<br/>'
                        + 'Deposited Silt: {{sensors[{0}].waterData.siltDeposit | format}}<hr/>'
                        + '<button ng-click="deleteSensor({0})">Delete Sensor</button></div>').format(id);

            var compiledHtml = $compile(html)($scope);

            var popup = L.popup({maxWidth: 160, minWidth: 160}).setContent(compiledHtml[0]);

            marker.bindPopup(popup).update().openPopup();
        });
    }

    $scope.fireTypeToString = FireSeverityModel.typeToString;
    $scope.vegTypeToString = VegetationModel.typeToString;

    $scope.addSensor = function() {
        if ($scope.addingSensor) {
            $scope.cancelAddingSensor();
            return;
        }

        $scope.addingSensor = true;
        map.leafletMap.on('click', addSensor);
    };

    $scope.cancelAddingSensor = function() {
        $scope.addingSensor = false;
        map.leafletMap.off('click', addSensor);
    };

    $scope.deleteSensor = function(id) {
        map.leafletMap.removeLayer($scope.sensors[id].marker);
        delete $scope.sensors[id];
    };

    $scope.drawVegetation = function(vegType) {
        console.log('draw veg', vegType);

        var modelSet = map.modelSet,
            vegModel = modelSet.getModel('Vegetation'),
            dataModel = vegModel.dataModel,
            elevationModel = modelSet.getDataModel('Elevation'),
            tf = vegModel.controls[vegType];

        for (var i = 0; i < dataModel.xSize; ++i) {
            for (var j = 0; j < dataModel.ySize; ++j) {
                var elevationValue = elevationModel.sample(modelSet.crs.modelCoordToCommonCoord({x:i, y:j}, dataModel)).elevation;
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
    $scope.drawAt = function(screenXY) {
        if ($scope.editedLayer) {
            var topLeft = map.leafletMap.containerPointToLatLng([
                screenXY.x - $scope.selectedBrushSize,
                screenXY.y - $scope.selectedBrushSize
            ]),
                bottomRight = map.leafletMap.containerPointToLatLng([
                screenXY.x + $scope.selectedBrushSize,
                screenXY.y + $scope.selectedBrushSize
            ]);

            var crs = map.modelSet.crs,
                curModel = $scope.editedLayer.model.dataModel,
                modelTopLeft = crs.commonCoordToModelCoord(topLeft, curModel),
                modelBottomRight = crs.commonCoordToModelCoord(bottomRight, curModel);

            var width = modelBottomRight.x - modelTopLeft.x,
                height = modelBottomRight.y - modelTopLeft.y;

            $scope.editedLayer.model.dataModel.putData(modelTopLeft.x, modelTopLeft.y, width, height, $scope.scaleValue.value);
            $scope.editedLayer.model.renderer.refreshLayer();
            
            // $scope.editedLayer.model.renderer.putData(point, $scope.selectedBrushSize, $scope.scaleValue.value);
        }
    };

    $scope.scaleValueChanged = function() {
        if ($scope.editedLayer.name === 'Vegetation') {
            $scope.editedLayer.model.show($scope.scaleValue.value.vegetation);
        }
    },

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
        layer.model.show();
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer.model.hide();
        $scope.editedLayer = null;
    };

    $scope.toggleSlope = function() {
        if ($scope.showSlope) {
            $scope.showSlope = false;
        }
        else {
            var waterModel = $scope.map.modelLayers[2].model.dataModel;
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

        var elevationModel = map.modelSet.getDataModel('Elevation');
        var waterModel = map.modelSet.getDataModel('Water Flow');

        elevationSampler.loadElevationData(elevationModel.geometry, function() {
            /* TODO: Maybe the sampler can be merged into ElevationModel */

            elevationModel.loadElevation(elevationSampler);
            waterModel.sampleElevation();

            $scope.elevationIsLoading = false;
            $scope.elevationLoaded = true;

            var erosionLayer = _.find(map.modelLayers, function(l) { return l.name === 'Erosion & Deposit'; });
            var waterLayer = _.find(map.modelLayers, function(l) { return l.name === 'Water Flow'; });

            map.toggleLayer(erosionLayer);
            map.toggleLayer(waterLayer);
        });
    });

}]);
