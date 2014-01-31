'use strict';

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
