
import {ElevationService} from 'js/ElevationService';
import {MapService} from 'js/MapService';

var Services = angular.module('Services', []);
Services.service('elevationSampler', ElevationService);
Services.service('map', MapService);
