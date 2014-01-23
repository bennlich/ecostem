'use strict';

function TransferFunction(domain, domainUnit, range, rangeUnit, title, svgcanvas_id) {

	var svgcanID = "transfer-function-svg"
	if (svgcanvas_id) {
		svgcanID = svgcanvas_id
	}

	var padding = 60,
		numSegments = 50, // number of samples used to draw the spline
		numCtrlPoints = 4,
		numSamples = 5000; // number of samples used to interpolate

	// currently a lot of variables belong to the 'transfer' function
	// eventually we may want to make these private, but for now it's helped
	// with debugging

	function transfer(x) {
		var idx = transfer.search(transfer.lookupTable, x),
			point = transfer.lookupTable[idx];

		// debug: show interpolated points on plot
		// transfer.container.append('circle')
		// 	.attr('cx', transfer.xScale(point[0]))
		// 	.attr('cy', transfer.yScale(point[1]))
		// 	.attr('r', 2)
		// 	.attr('fill', '#FFFFFF');

		return point[1];
	}

	transfer.search = d3.bisector(function(d) {
		return d[0];
	}).left;

	transfer.render = function() {
		
		//this.interpolate = Smooth(this.controlPoints, this.interpolatorOpts);
		//
		//  Curve fitting instead of smoother. It outputs a function. 
		//    This has it's own problems, especially when there are more than like 5 control points
		//
		var polynomialDegree = this.controlPoints.length - 1//matches every point exactly when degree is length-1
		this.polynomialCoeffients = matf.compute_coefficients(this.controlPoints, polynomialDegree)
		this.interpolate = function(x) {
			//res = cc[0] + cc[1]*x + cc[2]*x*x ...
			var cc = this.polynomialCoeffients
			var res = 0
			for (var i = 0; i < cc.length; i++) {
				res += Math.pow(x,i) * cc[i]
			}
			return [x, Math.min( range[1], Math.max(range[0], res))]
		}



		this.indexToXCoord.domain([0, this.pathData.length - 1]);
		for (var i = 0; i < this.pathData.length; i++) {
			this.pathData[i] = this.interpolate(this.indexToXCoord(i));
		}

		// TODO: Make the lookup table actually a lookup table
		// (instead of an array of samples to search through for the correct value)
		this.indexToXCoord.domain([0, this.lookupTable.length - 1]);
		for (var i = 0; i < this.lookupTable.length; i++) {
			this.lookupTable[i] = this.interpolate(this.indexToXCoord(i));
		}

		this.path
			.datum(this.pathData)
			.attr('d', this.pathGenerator);

		// for inspecting the distribution of interpolated points
		// this.container.selectAll('circle.test')
		// 	.data(this.pathData)
		// 		.attr('cx', function(d) { return transfer.xScale(d[0]); })
		// 		.attr('cy', function(d) { return transfer.yScale(d[1]); })
		// 		// .attr('cy', function(d) { return 80; })
		// 	.enter().append('circle')
		// 		.attr('class', 'test')
		// 		.attr('r', 1)
		// 		.attr('cx', function(d) { return transfer.xScale(d[0]); })
		// 		.attr('cy', function(d) { return transfer.yScale(d[1]); });
		// 		// .attr('cy', function(d) { return 80; });

		var controlGroup = this.container.selectAll('g.control')
			.data(this.controlPoints);
		controlGroup.select('circle.control')
			.attr('cx', function(d) {
				return transfer.xScale(d[0]);
			})
			.attr('cy', function(d) {
				return transfer.yScale(d[1]);
			});
		controlGroup.select('circle.handle')
			.attr('cx', function(d) {
				return transfer.xScale(d[0]);
			})
			.attr('cy', function(d) {
				return transfer.yScale(d[1]);
			});
	}

	var width = $('#' + svgcanID).width(),
		height = $('#' + svgcanID).height();

	// these scales convert from the extent of the data to
	// the extent of the svg canvas where we want to draw
	transfer.xScale = d3.scale.linear().domain(domain).range([0 + padding, width - padding]);
	transfer.yScale = d3.scale.linear().domain(range).range([height - padding, 0 + padding]);

	// setup control point coordinates equally spaced along path
	// TODO: start path as a sigmoid instead of a line?
	var xStep = (domain[1] - domain[0]) / (numCtrlPoints - 1),
		xValues = d3.range(domain[0], domain[1] + xStep, xStep),
		yStep = (range[1] - range[0]) / (numCtrlPoints - 1),
		yValues = d3.range(range[0], range[1] + yStep, yStep);

	transfer.controlPoints = new Array(numCtrlPoints);
	for (var i = 0; i < numCtrlPoints; i++) {
		transfer.controlPoints[i] = [
			xValues[i],
			yValues[i]
		];
	}

	// spline data and utils	
	transfer.pathData = new Array(numSegments);
	transfer.indexToXCoord = d3.scale.linear().domain([0, numSegments - 1]).range(domain);
	transfer.pathGenerator = d3.svg.line()
		.interpolate('linear')
		.x(function(d) {
			return transfer.xScale(d[0]);
		})
		.y(function(d) {
			return transfer.yScale(d[1]);
		});
	transfer.interpolatorOpts = {
		method: Smooth.METHOD_CUBIC,
		clip: Smooth.CLIP_CLAMP,
		cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM,
		scaleTo: domain
	};
	transfer.lookupTable = new Array(numSamples);

	// svg container
	var container = transfer.container = d3.select('#' + svgcanID).append('g');

	// path
	transfer.path = container.append('path')
		.attr('class', 'plot');

	// axes
	var xAxis = d3.svg.axis().scale(transfer.xScale).ticks(5).outerTickSize(0),
		yAxis = d3.svg.axis().scale(transfer.yScale).orient('left').ticks(5).outerTickSize(0);
	container.append('g')
		.attr('class', 'x-axis')
		.attr('transform', 'translate(0,' + (height - padding) + ')')
		.call(xAxis);
	container.append('g')
		.attr('class', 'y-axis')
		.attr('transform', 'translate(' + (padding) + ',0)')
		.call(yAxis);

	// labels
	container.append('text')
		.attr('class', 'title')
		.attr('text-anchor', 'middle')
		.attr('transform', 'translate(' + width / 2 + ',' + (padding - 30) + ')')
		.text(title);
	container.append('text')
		.attr('class', 'x-label')
		.attr('text-anchor', 'middle')
		.attr('transform', 'translate(' + width / 2 + ',' + (height - padding + 40) + ')')
		.text(domainUnit);
	container.append('text')
		.attr('class', 'y-label')
		.attr('text-anchor', 'middle')
		.attr('transform', 'rotate(-90) translate(' + -height / 2 + ',' + (padding - 40) + ')')
		.text(rangeUnit);

	// control points
	var controlGroup = container.selectAll('g.control')
		.data(transfer.controlPoints).enter()
		.append('g')
		.attr('class', 'control')
		.call(d3.behavior.drag()
			.on('drag', function(d, i) {
				var leftBound = domain[0],
					rightBound = domain[1];
				// TODO: Change the left and right bounds to ensure that
				// the user-generated spline is always a function
				// (i.e. no two y values corresponding to the same x value)
				if (i > 0) {
					leftBound = transfer.controlPoints[i - 1][0];
				}
				if (i < transfer.controlPoints.length - 1) {
					rightBound = transfer.controlPoints[i + 1][0];
				}
				d[1] = transfer.yScale.invert(d3.event.y);
				d[1] = Math.min(range[1], Math.max(range[0], d[1]));
				if (i > 0 && i < transfer.controlPoints.length - 1) { //don't allow extents to move towards center
					d[0] = transfer.xScale.invert(d3.event.x);
					d[0] = Math.min(rightBound, Math.max(leftBound, d[0]));
				}
				transfer.render();
			}));
	controlGroup.append('circle')
		.attr('class', 'control')
		.attr('r', 4)
		.attr('cx', function(d) {
			return transfer.xScale(d[0]);
		})
		.attr('cy', function(d) {
			return transfer.yScale(d[1]);
		});
	// handles are invisible circles that increase
	// the clickable area of control points
	controlGroup.append('circle')
		.attr('class', 'handle')
		.attr('r', 12)
		.attr('cx', function(d) {
			return transfer.xScale(d[0]);
		})
		.attr('cy', function(d) {
			return transfer.yScale(d[1]);
		});

	transfer.render();

	return transfer;
}