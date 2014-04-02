'use strict';

function Animator(modelSet) {
    this.modelSet = modelSet;

    this.reset();
}

Animator.prototype = {
    start: function() { 
        this._runningModels = _.filter(this.modelSet.getModels(), function(m) {
            return m.isAnimated;
        });

        this.isRunning = true;
        this._run();
    },

    stop: function() { 
        this.isRunning = false;
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
        }
    },

    reset: function() { 
        if (this.isRunning)
            this.stop();

        var models = this.modelSet.getModels();

        for (var i = 0; i < models.length; ++i) {       
            models[i].dataModel.reset();
            models[i].renderer.refreshLayer();
        }

        this.hours = 0;
        this.minutes = 0;
        this._raf = null;
        this.isRunning = false;
    },

    step: function() {
        var models = this.modelSet.getModels();

        for (var i = 0; i < models.length; ++i) {
            var model = models[i].dataModel;
            
            if (! model.isAnimated)
                continue;

            if (this.minutes % model.frameRate === 0)
                model.step();
        }

        this.minutes++;

        if (this.minutes === 59) {
            this.minutes = 0;
            this.hours++;
        }
    },

    _run: function() {
        console.log('run');
        if (this.isRunning) {
            this.modelSet.safeApply(this.step.bind(this));
            this._raf = window.requestAnimationFrame(this._run.bind(this));
        }
    }
};
