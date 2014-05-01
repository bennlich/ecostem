
/* These mixins augment the main application scope. See App.js */

import {TransferFunctions} from './ModelingParams/TransferFunctions';
import {FireSeverityModel} from './Models/FireSeverityModel';
import {VegetationModel} from './Models/VegetationModel';

export function TransferFunctionsMixin($scope) {
    $scope.activeTransferFunction = null;
    $scope.setActiveTransferFunction = function(tf) {
        $scope.activeTransferFunction = tf;
        TransferFunctions.show(tf.name);
    };
    $scope.closeActiveTransferFunction = function() {
        $scope.activeTransferFunction = null;
        TransferFunctions.hide();
    };

    $scope.showTransferFunctions = false;
    $scope.transferFunctions = [];
    $scope.toggleTransferFunctions = function() {
        if ($scope.transferFunctions.length === 0) {
            _.each(_.keys(TransferFunctions.funs), (k) => {
                $scope.transferFunctions.push({
                    name: k,
                    title: TransferFunctions.funs[k].title
                });
            });
        }
        $scope.showTransferFunctions = !$scope.showTransferFunctions;
    };
}

export function SandScanMixin($scope, map) {
    $scope.scanFlatDone = false;

    $scope.scanFlat = function() {
        AnySurface.Scan.flatScan(function() {
            $scope.safeApply(function() {
                $scope.scanFlatDone = true;
            });
        });
    }

    $scope.scanMountain = function() {
        AnySurface.Scan.mountainScan(function(data) {
            var modelName = 'Scan Elevation';
            var model = map.modelPool.getDataModel(modelName);

            if (! model) {
                var w = data.width,
                h = data.height,
                bbox = new ModelBBox(map.leafletMap.getBounds(), map.leafletMap);

                model = new ScanElevationModel(w, h, bbox, map.modelPool);
                model.load(data);

                var tileRenderer = new ModelTileRenderer(map, model, ElevationPatchRenderer(model));
                var tileServer = new ModelTileServer(tileRenderer);

                var obj = {
                    name: modelName,
                    dataModel: model,
                    renderer: tileRenderer,
                    server: tileServer
                }
                map.addDataLayer(obj);
            } else {
                model.load(data);
            }
        });
    };

    $scope.mountainScanDone = function() {
        var h = parser.headers;
        var width = h.cellsize * h.ncols;
        var height = h.cellsize * h.nrows;

        var southWest = new L.LatLng(h.yllcorner, h.xllcorner);
        var northEast = new L.LatLng(h.yllcorner+height, h.xllcorner+width);
        var box = new L.LatLngBounds(southWest, northEast);
        console.log(box);
        var modelBBox = new ModelBBox(box, map.leafletMap);

        var model = new GenericModel(h.ncols, h.nrows, modelBBox, map.modelPool.virtualWidth, map.modelPool);
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
    };
}

export function SensorsMixin($scope, $compile, map) {
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

            var elev = map.modelPool.models['Elevation'].dataModel;
            var water = map.modelPool.models['Water Flow'].dataModel;
            var veg = map.modelPool.models['Vegetation'].dataModel;
            var sev = map.modelPool.models['Fire Severity'].dataModel;
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

export function RasterPaintingMixin($scope, map) {
    $scope.editedLayer = null;
    $scope.scaleValue = {};

    $scope.brushSizes = [40, 30, 20, 10];
    $scope.selectedBrushSize = $scope.brushSizes[0];

    $scope.selectBrushSize = function(s) {
        $scope.selectedBrushSize = s;
    };

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

            var crs = map.modelPool.crs,
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
    };

    $scope.doneEditingDataLayer = function() {
        $scope.editedLayer.disabled = false;
        $scope.editedLayer.editing = false;
        $scope.editedLayer = null;
    };
}

export function VegetationAutofillMixin($scope, map) {
    $scope.drawVegetation = function(vegType) {
        console.log('draw veg', vegType);

        var modelSet = map.modelPool,
            vegModel = modelSet.getModel('Vegetation'),
            dataModel = vegModel.dataModel,
            elevationModel = modelSet.getDataModel('Elevation'),
            /* there is an implicit assumption here that vegType is
               the same as the transfer function key */
            tf = TransferFunctions.funs[vegType];

        for (var i = 0; i < dataModel.xSize; ++i) {
            for (var j = 0; j < dataModel.ySize; ++j) {
                var elevationValue = elevationModel.sample(modelSet.crs.modelCoordToCommonCoord({x:i, y:j}, dataModel)).elevation;
                var density = tf(elevationValue) / 100;

                if (Math.random() <= density) {
                    dataModel.putData(i, j, 1, 1, {vegetation: vegType});
                }
            }
        }

        vegModel.renderer.refreshLayer();
    };

    $scope.clearVegetation = function(vegType) {
        console.log('clear veg', vegType);

        var vegModel = map.modelPool.getModel('Vegetation'),
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
}

export function LayerPublishingMixin($scope) {
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

/* currently inactive */
function SlopeMixin() {
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
}
