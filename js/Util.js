'use strict';

function Rect(left,top,width,height) {
    this.left = left, this.top = top,
    this.width = width, this.height = height;
}

Rect.prototype = {
    intersect: function(rect) {
        var x0 = Math.max(this.left, rect.left);
        var x1 = Math.min(this.left + this.width, rect.left + rect.width);

        if (x0 <= x1) {
            var y0 = Math.max(this.top, rect.top);
            var y1 = Math.min(this.top + this.height, rect.top + rect.height);

            if (y0 <= y1) {
                return new Rect(x0, y0, x1-x0, y1-y0);
            }
        }
        return null;
    }
};

function clonePrototype(obj) {
    if (typeof obj !== 'undefined') {
	clonePrototype.prototype = Object(obj);
	return new clonePrototype;
    } else {
        /* this branch is hit when clonePrototype invokes
         * "new clonePrototype" in the branch above
         */
        return undefined;
    }
}

if (typeof String.prototype.format !== 'function') {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/\{(\w+)\}/g, function(match, number) {
            return typeof args[number] !== 'undefined'
                ? args[number]
                : match;
        });
    };
}

if (typeof String.prototype.namedFormat !== 'function') {
    String.prototype.namedFormat = function(dict) {
        return this.replace(/\{(\w+)\}/g, function(match, key) {
            return typeof dict[key] !== 'undefined'
                ? dict[key]
                : match;
        });
    };
}

if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(str) {
        return this.lastIndexOf(str, 0) === 0;
    };
}
