"use strict";

/* These mixins augment the main application scope. See App.js */

import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {FireSeverityModel} from '../st-api/Models/FireSeverityModel';
import {VegetationModel} from '../st-api/Models/VegetationModel';

export function layersMixin($scope, map) {
    $scope.toggleLayer = function(layer) {
        map.toggleLayer(layer);
    }

    $scope.setBaseLayer = function(layer) {
        map.setBaseLayer(layer);
    }
}

export function transferFunctionsMixin($scope, main, map) {
    TransferFunctions.init();

    var vegLayer = main.getModelLayer("Vegetation");

    for (var typ of ['fir', 'sagebrush', 'steppe', 'grass']) {
        TransferFunctions.funs[typ].on('change', () => {
            if (! map.leafletMap.hasLayer(vegLayer.leafletLayer))
                map.toggleLayer(vegLayer);
            $scope.clearVegetation(typ);
            $scope.drawVegetation(typ);
        });
    }

    $scope.transferFunctions = TransferFunctions.ctrls;

    $scope.activeTransferFunction = null;
    $scope.setActiveTransferFunction = function(tf) {
        $scope.activeTransferFunction = tf;
        TransferFunctions.show(tf);
        $scope.hideMainMenu();
    };
    $scope.closeActiveTransferFunction = function() {
        $scope.activeTransferFunction = null;
        TransferFunctions.hide();
        $scope.showMainMenu();
    };
}

export function sensorsMixin($scope, $compile, main, map) {
    /* TODO: The sensor implementation below is a hardcoded hack. A better sensor
       implementation would be sensitive to the addition/removal of models
       without having to edit this code every time. Also, the sensor HTML
       should be in a template and probably implemented as a directive. */

    $scope.addingSensor = false;
    $scope.sensorId = 0;
    $scope.sensors = {};

    $scope.fireTypeToString = FireSeverityModel.typeToString;
    $scope.vegTypeToString = VegetationModel.typeToString;

    function addSensor(e) {
        var marker = L.marker(e.latlng);

        marker.addTo(map.leafletMap);
        map.leafletMap.off('click', addSensor);

        $scope.$apply(function() {
            $scope.addingSensor = false;

            var elev = main.modelPool.models['Elevation'].dataModel;
            var water = main.modelPool.models['Water Flow'].dataModel;
            var veg = main.modelPool.models['Vegetation'].dataModel;
            var sev = main.modelPool.models['Fire Severity'].dataModel;
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
}

export function rasterPaintingMixin($scope, main, map) {
    $scope.editedLayer = null;
    $scope.scaleValue = {};

    $scope.brushSizes = [40, 30, 20, 10];
    $scope.selectedBrushSize = $scope.brushSizes[0];

    $scope.selectBrushSize = function(s) {
        $scope.selectedBrushSize = s;
    };

    /* when clicking in the scenario box and we're editing,
       put data on the map at that location.
       TODO: fishy stuff with brush sizes. Brushes are way too big. */
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

            var crs = main.modelPool.crs,
                curModel = $scope.editedLayer.model.dataModel,
                modelTopLeft = crs.commonCoordToModelCoord(topLeft, curModel),
                modelBottomRight = crs.commonCoordToModelCoord(bottomRight, curModel);

            var width = modelBottomRight.x - modelTopLeft.x,
                height = modelBottomRight.y - modelTopLeft.y;

            $scope.editedLayer.model.dataModel.putData(modelTopLeft.x, modelTopLeft.y, width, height, $scope.scaleValue.value);
            // $scope.editedLayer.model.renderer.putData(point, $scope.selectedBrushSize, $scope.scaleValue.value);
        }
    };

    $scope.scaleValueChanged = function() {
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
        $scope.scaleValues = layer.model.renderer.patchRenderer.scale();
        $scope.scaleValue = $scope.scaleValues[0];
        $scope.hideMainMenu();
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer = null;
        $scope.showMainMenu();
    };
}

export function menuMixin($scope) {
    $scope.toggleMainMenu = function() {
        $scope.menuVisible = !$scope.menuVisible;
    }

    $scope.hideMainMenu = function() {
        $scope.menuVisible = false;
    }

    $scope.showMainMenu = function() {
        $scope.menuVisible = true;
    }

    $scope.toggleSubMenu = function(menuName) {
        if ($scope.curMenu == menuName) {
            $scope.curMenu = null;
        }
        else {
            $scope.curMenu = menuName;
        }
    }
}

export function vegetationAutofillMixin($scope, main) {
    $scope.drawVegetation = function(typeName) {
        var vegType = VegetationModel.vegTypes[typeName.toUpperCase()];

        console.log('draw veg', vegType);

        var modelSet = main.modelPool,
            vegModel = modelSet.getModel('Vegetation'),
            vegDataModel = vegModel.dataModel,
            elevationModel = modelSet.getDataModel('Elevation'),
            /* TODO: there is an implicit assumption here that vegType is
               the same as the transfer function key */
            tf = TransferFunctions.funs[typeName];

        /* TODO: This loop is pretty slow. I suspect it's because the sampling
           is very slow. A better approach would be to build a sampler object
           that precomputes a lot of the stuff that goes on in LeafletCoordinateSystem
           so the sample() function is simple arithmetic computations. I imagine:

              var s = new Sampler(vegDataModel, elevationModel);
              elevValue = s.sample(i, j).elevation;

           The sampler constructor will have precomputed the two models' positions
           relative to each other in the coordinate system.
        */
        for (var i = 0; i < vegDataModel.width; ++i) {
            for (var j = 0; j < vegDataModel.height; ++j) {
                var elevationValue = elevationModel.sample(modelSet.crs.modelCoordToCommonCoord({x:i, y:j}, vegDataModel)).elevation;
                var density = tf.sample(elevationValue) / 100;

                if (Math.random() <= density) {
                    vegDataModel.world.vegetation[vegDataModel.toIndex(i,j)] = vegType;
                }
            }
        }

        vegDataModel.fire('change', vegDataModel.world);
    };

    $scope.clearVegetation = function(typeName) {
        var vegType = VegetationModel.vegTypes[typeName.toUpperCase()];
        console.log('clear veg', vegType);

        var vegModel = main.modelPool.getModel('Vegetation'),
            vegDataModel = vegModel.dataModel,
            vegTypes = VegetationModel.vegTypes;

        for (var i = 0; i < vegDataModel.size; ++i) {
            if (vegDataModel.world.vegetation[i] === vegType)
                vegDataModel.world.vegetation[i] = vegTypes.NONE;
        }

        vegDataModel.fire('change', vegDataModel.world);
    };
}

export function layerPublishingMixin($scope) {
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
}

export function roomsMixin($scope, roomsSvc) {
    $scope.showRooms = function() {
        $scope.hideMainMenu();
        $scope.roomsVisible = true;
    }

    $scope.hideRooms = function() {
        $scope.roomsVisible = false;
    }

    $scope.bindToRoom = function() {
        var stateRef = roomsSvc.getFbRef();

        // bind transfer functions
        stateRef.child('transferFunctions').on('child_added', function(snap) {
            var tfunc = TransferFunctions.funs[snap.name()];
            var tfuncCtrl = TransferFunctions.ctrls[snap.name()];

            if (!tfunc)
                return; // could create a new tfunc if it doesn't exist?

            // listen for changes to the tfunc's control point data
            snap.ref().child('controlPoints').on('value', function(snap) {
                var newCtrlPts = snap.val();
                if (newCtrlPts) {
                    tfunc.setControlPoints(newCtrlPts);
                    tfuncCtrl.setControlPoints(newCtrlPts);
                }
            });
        });

        // bind other stuff
    }
}
