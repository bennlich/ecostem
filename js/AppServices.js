
import {ElevationService} from './ElevationService';
import {MapService} from './MapService';

var Services = angular.module('Services', []);
Services.service('elevationSvc', ElevationService);
Services.service('mapSvc', MapService);
