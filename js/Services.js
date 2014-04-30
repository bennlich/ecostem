
import {ElevationService} from './ElevationService';
import {MapService} from './MapService';

var Services = angular.module('Services', []);
Services.service('elevationSampler', ElevationService);
Services.service('map', MapService);
