
import {TransferFunction} from 'js/TransferFunction';
import {StackedBars} from 'js/StackedBars';

export var TransferFunctions = {
    init : function() {
        this.slopeToVelocity = function() {
            var slopeToVelocity = new TransferFunction([0, 50], 'degrees', [0, 100], 'cm / s', 'Flow velocity vs. slope');
            slopeToVelocity.controlPoints = [[0.00,40.71],[11.25,43.93],[23.93,53.21],[35.00,69.64],[42.86,89.29],[50.00,100.00]];
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
            fir.controlPoints = [[0.00,0.00],[1171.43,0.00],[2028.57,4.29],[2600.00,28.57],[3171.43,3.21],[4000.00,0.00]];
            fir.render();
            return fir;
        }();

        this.sagebrush = function() {
            var sagebrush = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Sagebrush Density at Elevation');
            sagebrush.controlPoints = [[0.00,0.00],[1028.57,1.43],[2028.57,2.86],[2600.00,53.93],[3171.43,5.71],[4000.00,0.00]];
            sagebrush.render();
            return sagebrush;
        }();

        this.steppe = function() {
            var steppe = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Steppe Density at Elevation');
            steppe.controlPoints = [[0.00,0.00],[1000.00,0.00],[2285.71,0.00],[2857.14,4.29],[3428.57,49.64],[4000.00,0.00]];
            steppe.render();
            return steppe;
        }();


        this.grass = function() {
            var grass = new TransferFunction([0, 4000], 'm', [0, 100], '%', 'Grass Density at Elevation');
            grass.controlPoints = [[0.00,0.00],[1028.57,1.43],[1857.14,23.57],[2500.00,5.00],[3071.43,0.00],[3642.86,0.00]];
            grass.render();
            return grass;
        }();

        this.velocityToErosion = function() {
            var velocityToErosion = new TransferFunction([0, 100], 'cm/s', [0, 1], 'm', 'Erosion vs. Water Speed');
            velocityToErosion.controlPoints = [[0,0],[20,.2],[40,.4],[60,.6],[80,.8],[100,1]];
            velocityToErosion.render();
            return velocityToErosion;
        }();

        this.velocityToDeposit = function() {
            var velocityToDeposit = new TransferFunction([0, 100], 'cm/s', [0, 100], '% (of floating silt)', 'Deposit vs. Water Speed');
            velocityToDeposit.controlPoints = [[0,100],[20,80],[40,60],[60,40],[80,20],[100,0]];
            velocityToDeposit.render();
            return velocityToDeposit;
        }();
    }
};
