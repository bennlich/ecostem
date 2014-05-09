"use strict";

import {Leaflet} from '../st-api/Leaflet';

/* Leaflet wrapper */
export var MapService = ['$location', '$rootScope', '$q', function($location, $rootScope, $q) {
    var deferred = $q.defer();
    return {
        map: null,
        promise: deferred.promise,
        init: function(id) {
            this.map = new Leaflet(id, this._makeHomeBBox());

            if (!this._handleBBoxUrl()) {
                this.map.setHomeView();
            }

            this.map.addLayers();

            deferred.resolve(this);
        },

        _handleBBoxUrl: function() {
            var handled = false;
            // set map bounds to bbox argument in url
            var urlParams = $location.search(),
                bounds = urlParams.bbox && urlParams.bbox.split(',');
            if (bounds && bounds.length === 4) {
                this.map.leafletMap.fitBounds([
                    [bounds[0], bounds[1]],
                    [bounds[2], bounds[3]]
                ]);
                handled = true;
            }

            // update map bounds in bbox argument of url
            this.map.leafletMap.on('moveend', function() {
                var bounds = this.getBounds();
                $rootScope.safeApply(function() {
                    $location.search('bbox', '{s},{w},{n},{e}'.namedFormat({
                        s : bounds.getSouth(),
                        w : bounds.getWest(),
                        n : bounds.getNorth(),
                        e : bounds.getEast()
                    }));
                });
            });

            return handled;
        },

        _makeHomeBBox: function() {
            /* temp hack to handle "multiple scenarios" */
            var urlParams = $location.search(),
                room = urlParams.room;

            var bbox = room === 'ruidoso'
                ? this._createRuidosoBBox()
                : this._createTaosBBox();

            return bbox;
        },

        _createRuidosoBBox: function() {
            var south = 33.357555,
                west = -105.890007,
                north = 33.525149,
                east = -105.584793;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return bounds;
        },

        _createTaosBBox: function() {
            var south = 36.305124,
                west = -105.851524,
                north = 36.553087,
                east = -105.415564;

            var bounds = L.latLngBounds(
                new L.LatLng(south, west),
                new L.LatLng(north, east)
            );

            return bounds;
        }
    };
}];
