"use strict";

var Directives = angular.module('Directives', ['Services']);

Directives.directive('roomsWidget', ['roomsSvc', '$timeout', function(roomsSvc, $timeout) {
    return {
        // TODO: probably move the template into its own file?
        template:
            "<div id='rooms-widget' ng-show='roomsVisible'>"+
                "<div ng-hide='roomsSvc.isLoggedIn()'>"+
                    "<button class='inline' ng-click='loginAsGuest()'>Login as a guest</button>"+
                "</div>"+
                "<div ng-show='roomsSvc.isLoggedIn()'>"+
                    "<div>Logged in as <span>{{ getUserDisplayName() }}</span><button class='inline' ng-click='logout()'>Log out</button></div>"+
                    "<br>"+
                    "<div ng-hide='roomsSvc.isInARoom()'>"+
                        "<input type='text' ng-model='roomName'>"+
                        "<button class='inline' ng-click='joinRoom(roomName)'>Join room</button>"+
                    "</div>"+
                    "<div ng-show='roomsSvc.isInARoom()'>"+
                        "In room <span>{{ roomsSvc.getRoomName() }}</span>"+
                        "<button class='inline' ng-click='leave()'>Leave room</button>"+
                    "</div>"+
                "</div>"+
                "<br>"+
                "<button ng-click='hideRooms()'>Close</button>"+
            "</div>",
        replace: true,
        link: function(scope, element, attrs) {
            scope.roomsSvc = roomsSvc;

            // TODO: The following functions should probably belong to the roomsSvc
            // instead of to the roomsWidget, so that other components can take advantage of them.
            // I elected to make the roomsSvc a dead-simple wrapper around RoomClient, but the
            // (better) alternative would be to make the roomsWidget a dead-simple wrapper around
            // the roomsSvc.

            scope.getUserDisplayName = function() {
                if (!roomsSvc.user)
                    return;

                return roomsSvc.user.displayName ? roomsSvc.user.displayName : 'a guest';
            }

            scope.loginAsGuest = function() {
                roomsSvc.loginAsGuest().then(function() {
                    $timeout(function() {
                        console.log('Successfully logged in as guest')
                    });
                }, function(err) {
                    $timeout(function() {
                        console.log('Failed to log in as guest', err);
                    });
                });
            }

            scope.logout = function() {
                roomsSvc.logout().then(function() {
                    $timeout(function() {
                        console.log('Successfully logged out')
                    });
                }, function() {
                    $timeout(function() {
                        console.log('Failed to log out', err);
                    });
                });
            }

            scope.joinRoom = function(roomName) {
                roomsSvc.join(roomName)
                    .then(function() {
                        $timeout(function() {
                            // success! bind to room state here
                            console.log('success!');
                            // GOTCHA: This widget depends on the roomsMixin for the
                            // following two functions. Should this dependency be made more obvious?
                            scope.hideRooms();
                            scope.bindToRoom();
                        });
                    }, function(err) {
                        // fail
                        console.log('fail!', err);
                    });
            };

            scope.leave = function() {
                // TODO
            }
        }
    }
}]);

/* Hides the splash screen when elevation is done loading. */
Directives.directive('splashScreen', [function() {
    return function(scope, element) {
        scope.$watch('elevationLoaded', function(val) {
            if (!!val)
                element.fadeOut();
        });
    };
}]);

/* This directive shows the main app pane when it's done loading. */
Directives.directive('mainContainer', [function() {
    return function(scope, element) {
        scope.$watch('elevationLoaded', function(val) {
            if (!!val) {
                /* Kind of a dirty fun trick to get the app to fade in
                   after loading. The container is kept with visibility:hidden
                   in the loading phase. While it's not visible, it still
                   has dimensions, so d3 and leaflet can initialize off-screen.
                   (As opposed to display:none which would cause both Leaflet
                   and d3 to not initialize correctly.) Then we hide it
                   (which does a display:none), change its visibility,
                   and fade it in (which again affects the 'display' property,
                   not the visibility). */
                element.hide().css('visibility','visible').fadeIn();
            }
        });
    };
}]);

Directives.directive('drawingSurface', [function() {
    return function(scope, element) {
        function mouseHandler(e) {
            // var b = scope.editedLayer.model.dataModel.bbox,
            //     bx = b.xOffsetFromTopLeft(),
            //     by = b.yOffsetFromTopLeft(),
            //     bw = b.pixelWidth(),
            //     bh = b.pixelHeight(),

            //     x = e.clientX - bx,
            //     y = e.clientY - by;

            // if (x < 0 || x >= bw || y < 0 || y >= bh)
            //     return;

            // scope.drawAt({x:x,y:y});
            scope.drawAt({x: e.clientX, y: e.clientY});
        }

        element.drag('init', mouseHandler);
        element.drag(mouseHandler);
    };
}]);

Directives.directive('mapBody', ['mapSvc', function(mapSvc) {
    return function(scope, element, attrs) {
        mapSvc.init(attrs.id);
    };
}]);

Directives.directive('elevationCanvas', ['elevationSvc', function(elevationSvc) {
    return function(scope, element) {
        elevationSvc.init(element[0]);
    };
}]);

Directives.directive('ecoBackground', [function() {
    return function(scope, element, attrs) {
        var layer = scope.$eval(attrs.ecoBackground);
        element.css('background', 'url(img/preview/{0}.png)'.format(encodeURI(layer.name.toLowerCase())));
    };
}]);

Directives.directive('ecoIcon', [function() {
    var modelIconClasses = {
        'Elevation': 'mountain',
        'Fire Severity': 'fire',
        'Vegetation': 'leaf',
        'Erosion & Deposit': 'erosion',
        'Water Flow': 'droplet'
    };

    return function(scope, element, attrs) {
        element.addClass('icon-'+modelIconClasses[attrs.ecoIcon]);
        element.addClass('generic-menu-item-icon');
    };
}]);

// Directives.directive('setBaseLayer', ['mapSvc', function(mapSvc) {
//     return function(scope, element, attrs) {
//         var layer = scope.$eval(attrs.setBaseLayer);
//         element.css('background', 'url(img/preview/{0}.png)'.format(encodeURI(layer.name.toLowerCase())));
//         element.click(function() {
//             mapSvc.map.setBaseLayer(layer);
//             scope.safeApply();
//         });
//     };
// }]);

// Directives.directive('toggleLayer', ['mapSvc', function(mapSvc) {
//     return function(scope, element, attrs) {
//         var layer = scope.$eval(attrs.toggleLayer);
//         element.click(function() {
//             mapSvc.map.toggleLayer(layer);
//             scope.safeApply();
//         });
//     };
// }]);
