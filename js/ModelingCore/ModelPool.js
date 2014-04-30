
import {ElevationModel, ElevationPatchRenderer} from '../Models/ElevationModel';
import {ErosionModel, ErosionPatchRenderer} from '../Models/ErosionModel';
import {FireSeverityModel, FirePatchRenderer} from '../Models/FireSeverityModel';
import {VegetationModel, VegetationPatchRenderer} from '../Models/VegetationModel';
import {WaterModel, WaterPatchRenderer} from '../Models/WaterModel';
import {LeafletCoordSystem} from './LeafletCoordSystem';
import {ModelTileRenderer} from './ModelTileRenderer';
import {ModelTileServer} from '../ModelTileServer';
import {TransferFunctions} from '../ModelingParams/TransferFunctions';

export class ModelPool {
    constructor(map, defaultBBox, scope) {
        this.map = map;
        this.scope = scope;

        // hack for now
        this.defaultBBox = defaultBBox;

        this.models = this._makeModels();

        this.crs = new LeafletCoordSystem(map.leafletMap);
    }

    _makeModel(name, constructor, width, patchRendererClass, bbox, uiOpts, controls) {
        var ratio = bbox.pixelHeight() / bbox.pixelWidth(),
            height = Math.floor(width * ratio);

        var model = new constructor(width, height, bbox, this),
            patchRenderer = new patchRendererClass(model),
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer),
            tileServer = new ModelTileServer(tileRenderer);

        controls = controls || {};

        return {
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer,
            uiOpts : uiOpts,
            controls : controls,
            curControl : _.isEmpty(controls) ? null : _.keys(controls)[0],
            show: function(key) {
                this.hide();
                if (typeof key != 'undefined') {
                    this.curControl = key;
                }
                if (this.curControl) {
                    this.controls[this.curControl].show();
                }
            },

            hide: function() {
                console.log(this.curControl);
                if (this.curControl) {
                    this.controls[this.curControl].hide();
                }
            }
        };
    }

    _makeModels() {
        var bbox = this.defaultBBox;
        return {
            'Elevation'         : this._makeModel('Elevation', ElevationModel, 1024, ElevationPatchRenderer, bbox,
                                                  { canPaint: false, editable:false }),
            'Fire Severity'     : this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer, bbox,
                                                  { canPaint: true, editable: true }),
            'Vegetation'        : this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer, bbox,
                                                  { canPaint: true, editable: true },
                                                  {
                                                      1 : TransferFunctions.fir,
                                                      2 : TransferFunctions.sagebrush,
                                                      3 : TransferFunctions.steppe,
                                                      4 : TransferFunctions.grass
                                                  }),
            'Erosion & Deposit' : this._makeModel('Erosion & Deposit', ErosionModel, 400, ErosionPatchRenderer, bbox,
                                                  { canPaint: false, editable: true },
                                                  {
                                                      velocityToErosion: TransferFunctions.velocityToErosion,
                                                      velocityToDeposit: TransferFunctions.velocityToDeposit
                                                  }),
            'Water Flow'        : this._makeModel('Water Flow', WaterModel, 400, WaterPatchRenderer, bbox,
                                                  { canPaint: true, editable: true },
                                                  {
                                                      slopeToVelocity: TransferFunctions.slopeToVelocity,
                                                      evapInfRunoff: TransferFunctions.evapInfRunoff
                                                  })
        };
    }

    getModels() {
        return _.values(this.models);
    }

    getModel(name) {
        return this.models[name];
    }

    getDataModel(name) {
        var model = this.getModel(name);

        return model ? model.dataModel : null;
    }

    safeApply(fn) {
        this.scope.safeApply(fn);
    }
}
