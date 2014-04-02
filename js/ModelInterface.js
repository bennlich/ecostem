// A model is a collection of data.

MyModel.prototype = {
	
	// The way the data is stored is up to the modeler
	// (e.g. array, quadtree, geohash, tiles).
	world: [
		[1, 0, 1],
		[0, 1, 0],
		[1, 0, 1]
	],

	// The data exist in a coordinate system
	crs: LeafletCoordinateSystem, // web mercator

	// relative to an origin
	origin: { x: -110.2345, y: 35.634 },

	// at a specific resolution.
	sampleWidth: 0.35, // degrees
	sampleHeight: 0.35,

	// A model can be sampled,
	sample: function(coord) {
		var xy = this.crs.globalCoordToModelXY(latlng, this);

		if (xy.x >= this.world.length || xy.y >= this.world[xy.x].length) {
			return undefined;
		}

		return this.world[xy.x][xy.y];
	},

	// and it can evolve over time.
	timeStep: 1, // second

	step: function() {
		// Its evolution might be a function of other models,
		// in which case it should know where to find them.
		var myOtherModel = this.modelSet.get("myOtherModel");

		for (var i = 0; i < world.length; i++) {
			for (var j = 0; j < world[i].length; j++) {
				// Models that work well together
				// support a common sampling interface
				// and global coordinate system.
				var globalCoord = this.crs.modelXYToGlobalCoord({ x:i, y:j }, this);
				
				var otherModelVal;
				if (myOtherModel) {
					otherModelVal = myOtherModel.sample(globalCoord);
				}

				world[i][j] += otherModelVal ? 5 : 1;
			}
		}
	}

}