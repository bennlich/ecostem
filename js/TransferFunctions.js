'use strict';

var TransferFunctions = {
    init : function() {
        this.slopeToVelocity = function() {
            var slopeToVelocity = new TransferFunction([0, 50], 'degrees', [0, 100], 'cm / s', 'Flow velocity vs. slope');
            slopeToVelocity.controlPoints[0] = [0,50];
            slopeToVelocity.controlPoints[1] = [22,55];
            slopeToVelocity.render();
            return slopeToVelocity;
        }();

        this.evapInfRunoff = new StackedBars({
            domain: ['No Data', 'Low', 'Medium', 'High'],
            domainTitle: 'Burn Severity',
            range: ['Evaporation', 'Infiltration', 'Runoff'],
            rangeTitle: 'Percentage of Water Volume'
        });

        this.fir = function() {
            var fir = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Fir Density at Elevation');
            fir.controlPoints = [[2214,0], [2442,15], [2728,1], [4000,0]];
            fir.render();
            return fir;
        }();

        this.sagebrush = function() {
            var sagebrush = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Sagebrush Density at Elevation');
            sagebrush.controlPoints = [[1842,0], [1985,47.5], [2100,0], [4000,0]];
            sagebrush.render();
            return sagebrush;
        }();

        this.steppe = function() {
            var steppe = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Steppe Density at Elevation');
            steppe.controlPoints = [[0,0], [2657,0], [2871,26], [3042,0]];
            steppe.render();
            return steppe;
        }();


        this.grass = function() {
            var grass = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Grass Density at Elevation');
            grass.controlPoints = [[0,0], [2114,0], [2199,18], [2330,0]];
            grass.render();
            return grass;
        }();

        this.velocityToErosion = function() {
            var velocityToErosion = new TransferFunction([0, 100], 'cm/s', [0, 1], 'm', 'Erosion vs. Water Speed');
            velocityToErosion.controlPoints = [[0,0],[40,.4],[60,.6],[100,1]];
            velocityToErosion.render();
            return velocityToErosion;
        }();

        this.velocityToDeposit = function() {
            var velocityToDeposit = new TransferFunction([0, 100], 'cm/s', [0, 100], '% (of floating silt)', 'Deposit vs. Water Speed');
            velocityToDeposit.controlPoints = [[0,100],[40,60],[60,40],[100,0]];
            velocityToDeposit.render();
            return velocityToDeposit;
        }();
    }
};
