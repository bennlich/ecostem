
import {ElevationService} from './ElevationService';
import {MapService} from './MapService';
import {Main} from './Main';

var Services = angular.module('Services', []);
Services.service('elevationSvc', ElevationService);
Services.service('mapSvc', MapService);

Services.service('mainSvc', ['$rootScope', '$q', 'mapSvc', function($rootScope, $q, mapSvc) {
    "use strict";
    return {
        main: null,
        deferred: $q.defer(),
        init: function() {
            console.log('herex',mapSvc);
            this.main = new Main(mapSvc.map);

            /* The following two statements are a way for the angular world to get
               live updates when the animator steps and when a model changes due to
               its putData method being called -- which normally happens when
               painting.

               This is an arguably cleaner way for angular to get updates, compared
               to passing the $rootScope into the non-angular API, which would not
               make sense when the API is used from a non-angular world. */

            _.each(_.values(this.main.modelPool.models), (m) => {
                m.dataModel.wrapUpdate((fn) => $rootScope.safeApply(fn));
            });

            this.main.animator.wrapStep((fn) => $rootScope.safeApply(fn));

            this.deferred.resolve(this);
        }
    };
}]);
