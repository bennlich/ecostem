'use strict';

function TransferFunction(domain, domainUnit, range, rangeUnit, title) {

	// currently a lot of variables belong to the 'transfer' function
	// eventually we may want to make these private, but it's good for debugging for now

	function transfer(x) {
		var leftIndex = 0, rightIndex, leftPoint, rightPoint, leftBound, rightBound,
			controlPoints = transfer.controlPoints;

		// find the control points located on either side of x
		for (var i = 0; i < controlPoints.length; i++) {
			var xCoord = controlPoints[i][0];
			if (xCoord >= x) {
				leftIndex = Math.max(0, i-1);
				rightIndex = i;
				leftPoint = controlPoints[leftIndex];
				rightPoint = controlPoints[rightIndex];
				leftBound = leftPoint[0];
				rightBound = rightPoint[0];
				break;
			}
		}

		// Currently the interpolator has problems interpolating points between
		// the first and second control points, and between the last and second to last
		// control points. I was experimenting with buffering the control points with duplicates
		// to sidestep this issue.

		// see https://github.com/osuushi/Smooth.js/issues/4

		// var bufferedPoints = [ controlPoints[0] ].concat(controlPoints, [controlPoints[controlPoints.length - 1]]);
		// console.log('buffered', bufferedPoints);

		var interpolatorOpts = {
			method: Smooth.METHOD_CUBIC,
			clip: Smooth.CLIP_CLAMP,
			cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM
		};

		var interpolate = Smooth(controlPoints, interpolatorOpts);
		// map the x coordinate to a fractional index between
		// surrounding control points
		var xCoordToIndex = d3.scale.linear()
			.domain([leftBound, rightBound])
			.range([leftIndex, rightIndex]);
		
		var interpolatedX = interpolate(xCoordToIndex(x));

		/* debug */
		console.log(
			'leftIndex', leftIndex,
			'rightIndex', rightIndex,
			'leftBound', leftBound,
			'rightBound', rightBound,
			'index', xCoordToIndex(x),
			'interpolatedX', interpolatedX
		);

		transfer.container.append('circle')
			.attr('cx', transfer.xScale(interpolatedX[0]))
			.attr('cy', transfer.yScale(interpolatedX[1]))
			.attr('r', 2)
			.attr('fill', '#FFFFFF');
		/* end debug */

		return interpolatedX[1];
	}

	transfer.render = function() {
		this.interpolate = Smooth(this.controlPoints, this.interpolatorOpts);

		for (var i = 0; i < this.pathData.length; i++) {
			this.pathData[i] = this.interpolate(this.indexToXCoord(i));
		}

		this.path
			.datum(this.pathData)
			.attr('d', this.pathGenerator);

		var controlGroup = this.container.selectAll('g.control')
			.data(this.controlPoints);
		controlGroup.select('circle.control')
			.attr('cx', function(d) { return transfer.xScale(d[0]); })
			.attr('cy', function(d) { return transfer.yScale(d[1]); });
		controlGroup.select('circle.handle')
			.attr('cx', function(d) { return transfer.xScale(d[0]); })
			.attr('cy', function(d) { return transfer.yScale(d[1]); });
	}

	var padding = 60,
		width = $('#transfer-function-svg').width(),
		height = $('#transfer-function-svg').height();

	// these scales convert from the extent of the data to
	// the extent of the svg canvas where we want to draw
	transfer.xScale = d3.scale.linear().domain(domain).range([0+padding, width-padding]);
	transfer.yScale = d3.scale.linear().domain(range).range([height-padding, 0+padding]);

	// setup control point coordinates equally spaced along path
	// TODO: start path as a sigmoid instead of a line?
	var numCtrlPoints = 5,
		xStep = (domain[1]-domain[0])/(numCtrlPoints-1),
		xValues = d3.range(domain[0], domain[1]+xStep, xStep),
		yStep = (range[1]-range[0])/(numCtrlPoints-1),
		yValues = d3.range(range[0], range[1]+yStep, yStep);

	transfer.controlPoints = new Array(numCtrlPoints);
	for (var i = 0; i < numCtrlPoints; i++) {
		transfer.controlPoints[i] = [
			xValues[i],
			yValues[i]
		];
	}

	// spline data and utils
	var numSegments = 50; // number of line segments used to draw the spline
	
	transfer.pathData = new Array(numSegments);
	transfer.indexToXCoord = d3.scale.linear().domain([0,numSegments-1]).range(domain);
	transfer.pathGenerator = d3.svg.line()
		.interpolate('linear')
		.x(function(d) { return transfer.xScale(d[0]); })
		.y(function(d) { return transfer.yScale(d[1]); });
	transfer.interpolatorOpts = {
		method: Smooth.METHOD_CUBIC,
		clip: Smooth.CLIP_CLAMP,
		cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM,
		scaleTo: domain
	};

	// svg container
	var container = transfer.container = d3.select('#transfer-function-svg').append('g');
	
	// path
	transfer.path = container.append('path')
		.attr('class', 'plot');
	
	// axes
	var xAxis = d3.svg.axis().scale(transfer.xScale).ticks(5).outerTickSize(0),
		yAxis = d3.svg.axis().scale(transfer.yScale).orient('left').ticks(5).outerTickSize(0);
	container.append('g')
		.attr('class', 'x-axis')
		.attr('transform', 'translate(0,'+ (height - padding) +')')
		.call(xAxis);
	container.append('g')
		.attr('class', 'y-axis')
		.attr('transform', 'translate('+ (padding) +',0)')
		.call(yAxis);

	// labels
	container.append('text')
		.attr('class', 'title')
		.attr('text-anchor', 'middle')
		.attr('transform', 'translate('+ width/2 +','+ (padding - 30) +')')
		.text(title);
	container.append('text')
		.attr('class', 'x-label')
		.attr('text-anchor', 'middle')
		.attr('transform', 'translate('+ width/2 +','+ (height - padding + 40) +')')
		.text(domainUnit);
	container.append('text')
		.attr('class', 'y-label')
		.attr('text-anchor', 'middle')
		.attr('transform', 'rotate(-90) translate('+ -height/2 +','+ (padding - 40) +')')
		.text(rangeUnit);

	// control points
	var controlGroup = container.selectAll('g.control')
		.data(transfer.controlPoints).enter()
			.append('g')
			.attr('class', 'control')
			.call(d3.behavior.drag()
				.on('drag', function(d, i) {
					var leftBound = domain[0], rightBound = domain[1];
					// TODO: Change the left and right bounds to ensure that
					// the user-generated spline is always a function
					// (i.e. no two y values corresponding to the same x value)
					if (i > 0) {
						leftBound = transfer.controlPoints[i-1][0];
					}
					if (i < transfer.controlPoints.length - 1) {
						rightBound = transfer.controlPoints[i+1][0];
					}
					d[0] = transfer.xScale.invert(d3.event.x);
					d[1] = transfer.yScale.invert(d3.event.y);
					d[0] = Math.min(rightBound, Math.max(leftBound, d[0]));
					d[1] = Math.min(range[1], Math.max(range[0], d[1]));
					transfer.render();
				}));
	controlGroup.append('circle')
		.attr('class', 'control')
		.attr('r', 4)
		.attr('cx', function(d) { return transfer.xScale(d[0]); })
		.attr('cy', function(d) { return transfer.yScale(d[1]); });
	// handles are invisible circles that increase
	// the clickable area of control points
	controlGroup.append('circle')
		.attr('class', 'handle')
		.attr('r', 12)
		.attr('cx', function(d) { return transfer.xScale(d[0]); })
		.attr('cy', function(d) { return transfer.yScale(d[1]); });

	transfer.render();

	return transfer;
}