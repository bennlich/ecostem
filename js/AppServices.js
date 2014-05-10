"use strict";

import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';
import {MapService} from './MapService';
import {Main} from './Main';

var Services = angular.module('Services', []);

/* the map service is in a separate file because it's large enough... */
Services.service('mapSvc', MapService);

Services.service('elevationSvc', ['$q', function($q) {
    var deferred = $q.defer();
    return {
        promise: deferred.promise,
        sampler: null,
        init: function(canvas) {
            this.sampler = new RemoteBBoxSampler(canvas);
            deferred.resolve(this);
        }
    };
}]);

Services.service('mainSvc', ['$rootScope', '$q', 'mapSvc', function($rootScope, $q, mapSvc) {
    return {
        main: null,
        init: function() {
            this.main = new Main(mapSvc.map);

            /* The following two statements are a way for the angular world to get
               live updates when the animator steps and when a model changes due to
               its putData method being called -- which normally happens when
               painting.

               This is an arguably cleaner way for angular to get updates, compared
               to passing the $rootScope into the non-angular API, which would not
               make sense when the API is used from a non-angular world. */

            _.each(_.values(this.main.modelPool.models), (m) => {
                m.dataModel.on('change', () => $rootScope.safeApply());
            });

            this.main.animator.on('step', () => $rootScope.safeApply());
        }
    };
}]);
