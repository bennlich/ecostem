'use strict';

var FireSeverityLayer = L.CanvasLayer.extend({
    render: function() {
        var canvas = this.getCanvas();
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(40,170,255, 0.7)';
        ctx.fillRect(40,50,100,200);
    }
});

var VegetationDensityLayer = L.CanvasLayer.extend({
    render: function() {
        var canvas = this.getCanvas();
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(255,170,40, 0.7)';
        ctx.fillRect(100,50,100,200);
    }
});
