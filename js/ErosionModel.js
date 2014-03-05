'use strict';

function ErosionModel(xs, ys, fixedGeometryWidth, modelSet) {
    DataModel.call(this, xs, ys, fixedGeometryWidth, modelSet);

    this.isAnimated = true;

    this.reset();

    this.tf = new TransferFunction([0, 1], 'm/s', [-100, 100], 'cm', 'Erosion vs. Water Speed', 'svg-erosion');
    this.tf.controlPoints = [[0, 20], [0.4, 5], [0.8, -20], [1, -40]];
    this.tf.render();
    this.tf.show();
}

ErosionModel.prototype = _.extend(clonePrototype(DataModel.prototype), {
    reset: function() {
        this.init({ erosion: 0 });
    },

    setValueForVelocity: function(i,j,velocity) {
        var erosionValue = this.tf(velocity);
        this.world[i][j].erosion += erosionValue;
    }
});

var ErosionPatchRenderer = function(model) {
    var gradientSteps = 100,
        negativeGradient = Gradient.gradient('#ffebeb', '#e03838', gradientSteps),
        positiveGradient = Gradient.gradient('#dbecff', '#2e7ad1', gradientSteps);

    function getColor(value) {
        var idx = Math.floor(Math.abs(value));

        if (idx >= negativeGradient.length)
            idx = negativeGradient.length - 1;

        if (value > 0) {
            return positiveGradient[idx];
        }

        if (value < 0) {
            return negativeGradient[idx];
        }

        return 'rgb(0,0,0)';
    }

    function render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch;

        if (!world[i] || !(patch = world[i][j])) {
            return;
        }

        if (patch.erosion === 0)
            return;
        var color = getColor(patch.erosion);
        console.log(color, patch.erosion);
        ctx.fillStyle = getColor(patch.erosion);
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
    }

    var scale = _.map([-20,-10,-5,0,5,10,20], function(n) {
        var name = n;

        if (n === 0)
            name = 'None (Erase)';

        return { 
            value: { erosion: n },
            color: getColor(n),
            name: name
        };
    });

    return { 
        render: render,
        scale: scale
    };
};
