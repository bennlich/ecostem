var WaterModel = function() {
    var DataSet = ABM.DataSet;
    var Util = ABM.util;

    ABM.Model.prototype.startup = function() {
        this.elevation = DataSet.importAscDataSet("data/nldroplets.asc", function(ds) {
            var slopeAndAspect = ds.slopeAndAspect();
            this.slope = slopeAndAspect[0];
            this.aspect = slopeAndAspect[1];
        }.bind(this));
    };

    ABM.Model.prototype.setup = function() {
        this.refreshPatches = false;
        this.refreshLinks = false;

        this.vision = 1;
        this.speed = 0.25;

        this.agents.setDefault("shape", "square");
        this.agents.setDefault("size", 0.5);
        this.agents.setDefault("color", [100, 100, 150]);

        this.img = this.elevation.toDrawing();

        this.patches.forEach(function(p) {
            p.sprout(1);
        });

        this.movedAtLastStep = 0;
    };

    ABM.Model.prototype.step = function() {
        var moved = 0;
        this.agents.forEach(function(agent) {
            var elevation = this.elevation.patchSample(agent.x, agent.y);
            var neighborElevations = this.elevation.neighborhood(agent.x, agent.y);

            var minElevation = Util.minOneOf(neighborElevations, function(x) { return x; });
            if (minElevation !== elevation) {
                agent.heading = this.aspect.patchSample(agent.x, agent.y);
                agent.forward(this.speed);
                moved += 1;
            }
        }.bind(this));

        console.log(moved + ' agents moved.');

        if (moved === this.movedAtLastStep) {
            this.stop();
        }
        if (this.anim.ticks % 100 === 0) {
            this.movedAtLastStep = moved;
        }
    };

    return ABM.Model;
}();
