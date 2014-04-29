
export class AscParser {
    constructor() {
        this.cursor = 0;
        this.headers = {};
        this.data = null;
        this.parsed = false;
    }

    parseToken(stream) {
        while (stream[this.cursor] === ' '
               || stream[this.cursor] === '\n'
               || stream[this.cursor] === '\r')
        {
            this.cursor++;
        }

        var t = "";

        while (stream[this.cursor] !== ' '
               && stream[this.cursor] !== '\n'
               && stream[this.cursor] !== '\r')
        {
            t += stream[this.cursor];
            this.cursor++;
        }

        return t;
    }

    parseHeaders(stream) {
        for (var i = 0; i < 6; ++i) {
            var key = this.parseToken(stream),
                value = parseFloat(this.parseToken(stream));
            this.headers[key] = value;
        }
    }

    parseBody(stream) {
        var i = 0, j = 0;

        var nrows = this.headers.nrows,
            ncols = this.headers.ncols,
            nodata = this.headers.NODATA_value;

        var progressSteps = Math.floor((nrows * ncols)/20),
            steps = 0,
            fun = typeof this.progressFunction === 'function' ? this.progressFunction : undefined;

        while (true) {
            steps++;

            if (fun && steps % progressSteps === 0) {
                fun();
            }

            var t = parseFloat(this.parseToken(stream));

            if (t !== nodata)
                this.data[i][j] = t;

            i++;

            if (i >= ncols) {
                i = 0;
                j++;
                if (j >= nrows)
                    break;
            }
        }
        console.log('done');
    }

    reset() {
        this.cursor = 0;
        this.headers = {};
        this.data = null;
        this.parsed = false;
    }

    parse(stream, progressFunction) {
        this.reset();

        this.progressFunction = progressFunction;

        this.parseHeaders(stream);

        this.data = new Array(this.headers.ncols);
        for (var i = 0; i < this.headers.ncols; ++i) {
            this.data[i] = new Array(this.headers.ncols);
        }

        this.parseBody(stream);
        this.parsed = true;
    }
}

/*
 * Generic rect utility
 */

export class Rect {
    constructor(left,top,width,height) {
        this.left = left, this.top = top,
        this.width = width, this.height = height;
    }

    intersect(rect) {
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
}

/*
 * This is used for implementing prototype-based inheritance
 */

export function extend(prototype, props) {
    var obj = Object.create(prototype);
    return _.extend(obj, props);
}

/*
 * Add useful functions to the string prototype
 */

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

export default {};
