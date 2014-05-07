"use strict";

import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';

export var ElevationService = ['$q', function($q) {
    return {
        deferred: $q.defer(),
        url: "http://node.redfish.com/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}",
        sampler: null,
        init: function(canvas) {
            this.sampler = new RemoteBBoxSampler(canvas, this.url);
            this.deferred.resolve(this);
        }
    };
}];
