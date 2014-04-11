
var AnySurface = AnySurface || {};

AnySurface.Laser = function(chrome) {
    if (! chrome) {
        throw new Error('Anysurface supports only the Chrome browser.');
    }

    var app = {
        getID: function() {
            return document.getElementById('laserExtensionID').innerText;
        },

        getCorr: function(callback) {
            chrome.runtime.sendMessage(app.getID(), 'getcorres', function(e) {
                console.log('msg', e);
                if (e && e.search('data:image/') > -1) {
                    if (typeof callback === 'function') {
                        callback(e);
                    }
                }
            });
        },

        calib: function(callback) {
            function itsdone() {
                console.log('finally done');
                if (typeof callback === 'function') {
                    callback();
                }
                document.removeEventListener('grayDisplayControllerDone', itsdone, false);
            }

            document.addEventListener('grayDisplayControllerDone', itsdone, false);
            chrome.runtime.sendMessage(app.getID(), 'calibrate');
        },

        lasermove: function(callback) {
            //override this function to recieve laser messages
        },

        turnOffVMouse: function( ){
            var event = new CustomEvent('virtualMouse', {'detail':{'enabled':false} });
            document.dispatchEvent(event);
        },

        turnOnVMouse: function( ){
            var event = new CustomEvent('virtualMouse', {'detail':{'enabled':true} });
            document.dispatchEvent(event);
        },

        getState: function(callback) {
            chrome.runtime.sendMessage(app.getID(), 'state', function(e) {
                if (typeof callback === 'function') {
                    callback(e);
                }
            });
        }
    };

    document.addEventListener('lasermove', function(e) {
        app.lasermove(e);
    }, false);

    return app;
}(chrome);

AnySurface.Scan = function() { return {
    projWid: 1280,
    projHei: 768,
    camWid: 0,
    camHei: 0,
    flatProjXY: null,
    moundProjXY: null,
    flatCamXY: null,
    moundCamXY: null,
    differencesXY: null,
    moundImg: new Image(),
    flatImg: new Image(),
    //
    //  Fill arrays with data
    //
    setup: function(flatImgsrc, moundImgsrc, callbackA) {
        console.log('   threeDiScan.setup called');

        var imgF = document.createElement('img');
        var imgM = document.createElement('img');
        var loaded = 0;
        var this2 = this;

        imgM.onload = imgF.onload = function() {
            console.log('   making imageData');
            var can = document.createElement('canvas');
            can.width = this.width;
            can.height = this.height;
            var ctx = can.getContext('2d');
            ctx.drawImage(this, 0, 0);
            this.imgData = ctx.getImageData(0, 0, can.width, can.height);
            console.log(can.toDataURL("image/png"));
            loaded += 1;
            if (loaded >= 2) {
                this2._setupArrays(this2.flatImg.imgData, this2.moundImg.imgData);
                this2.find3D();
                if (callbackA) {
                    callbackA();
                }
            }
        };

        this.flatImg = imgF;
        this.moundImg = imgM;
        imgF.src = flatImgsrc;
        imgM.src = moundImgsrc;
    },

    find3D: function() {
        var iterations = 900;
        var blur = true;

        // fill in the holes in the data.
        var d = this.flood(this.flatProjXY, iterations);
        var c = this.flood(this.moundProjXY, iterations);

        //find differences
        this.differencesXY = this.difference(c, d);
        if (blur) {
            this.differencesXY = this.blur(this.differencesXY);
        }
    },

    _setupArrays: function(flatImgData, moundImgData) {
        console.log("   threeDiScan setting up arrays");

        var start = new Date().getTime();

        this.camWid = flatImgData.width;
        this.camHei = flatImgData.height;

        this.flatProjXY = this._fillerProj(flatImgData);
        this.moundProjXY = this._fillerProj(moundImgData);
        this.flatCamXY = this._fillerCam(flatImgData);
        this.moundCamXY = this._fillerCam(moundImgData);

        var end = new Date().getTime();
        console.log('   threeDiScan, array setup took ', end - start, ' ms');
    },

    //
    //  Convert rgb encode image to a projector to camera lookup table
    //
    _fillerProj: function(imgdata) {
        var w = this.projWid;
        var h = this.projHei;
        var result = [new Int32Array(w * h), new Int32Array(w * h)];

        var width = imgdata.width;
        var height = imgdata.height;
        var data = imgdata.data;

        for (var y = 0; y < height; y += 1) {
            for (var x = 0; x < width; x += 1) {
                var baseIndex = ((y * width) + x) * 4;
                var r = data[baseIndex];
                var g = data[baseIndex + 1];
                var b = data[baseIndex + 2];

                var projectorX = this.rgb2Xcoord(r, g, b); //((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
                var projectorY = this.rgb2Ycoord(r, g, b); //((g << 8) & 0x0F00) | (b & 0x00FF);
                var projIndex = projectorY * this.projWid + projectorX;
                if (projectorX < w && projectorY < h) {
                    result[0][projIndex] = x;
                    result[1][projIndex] = y;
                }
            }
        }

        result.width = w;
        result.height = h;

        return result;
    },

    //
    // convert the rgb into numbers. I find this much easier to work with
    //
    _fillerCam: function(imgdata) {
        var width = imgdata.width;
        var height = imgdata.height;
        var data = imgdata.data;
        var result = [new Int32Array(width * height), new Int32Array(width * height)];

        for (var y = 0; y < height; y += 1) {
            for (var x = 0; x < width; x += 1) {
                var baseIndex = ((y * width) + x) * 4;
                var r = data[baseIndex];
                var g = data[baseIndex + 1];
                var b = data[baseIndex + 2];

                var projectorX = this.rgb2Xcoord(r, g, b); //((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
                var projectorY = this.rgb2Ycoord(r, g, b);
                result[0][y * width + x] = projectorX;
                result[1][y * width + x] = projectorY;
            }
        }

        result.width = width;
        result.height = height;

        return result;
    },

    rgb2Xcoord: function(r, g, b) {
        return ((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
    },

    rgb2Ycoord: function(r, g, b) {
        return ((g << 8) & 0x0F00) | (b & 0x00FF);
    },

    difference: function(xyarrayA, xyarrayB, wid, hei) {
        var start = new Date().getTime();
        var dim = this.checkDimensions(xyarrayA, wid, hei);
        wid = dim[0];
        hei = dim[1];

        var MINVAL = -200;
        var MAXVAL = 600;
        var A = xyarrayA;
        var B = xyarrayB;
        var diff = [new Int32Array(xyarrayA[0].length), new Int32Array(xyarrayA[0].length)];

        for (var i = 0; i < diff[0].length; i++) {
            if (B[0][i] > 0 && A[0][i] > 0 && B[1][i] > 0 && A[1][i] > 0) {
                diff[0][i] = A[0][i] - B[0][i];
                diff[1][i] = A[1][i] - B[1][i];
            }
        }

        diff.width = wid;
        diff.height = hei;
        var end = new Date().getTime();
        console.log('  difference took', end - start, 'ms');
        return diff;
    },

    flood: function(xyarray, iterations, wid, hei) {
        var dim = this.checkDimensions(xyarray, wid, hei);
        wid = dim[0];
        hei = dim[1];

        var start = new Date().getTime();
        var len = xyarray[0].length;
        var res1 = [new Int32Array(len), new Int32Array(len)];
        var Xa = res1[0];
        var Ya = res1[1];
        var seeds1 = [];
        var seeds2 = [];
        var mOffsets = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0]
        ];

        for (var i = 0; i < len; i++) {
            Xa[i] = xyarray[0][i];
            Ya[i] = xyarray[1][i];
            if (Xa[i] > 0 && Ya[i] > 0) {
                seeds1.push(i);
            }
        }

        console.log('seeds:', seeds1.length);

        for (var it = 0; it < iterations && seeds1.length > 0; it++) {
            for (i = 0; i < seeds1.length; i++) {
                var index1 = seeds1[i];
                var y1 = Math.floor(index1 / wid);
                var x1 = index1 % wid;
                for (var j = 0; j < mOffsets.length; j++) {
                    var offset = mOffsets[j];
                    var x2 = x1 + offset[0];
                    var y2 = y1 + offset[1];
                    var index2 = y2 * wid + x2;
                    if (x2 >= 0 && x2 < wid - 1 && y2 >= 0 && y2 < hei - 1) {
                        var p1x = Xa[index1];
                        var p1y = Ya[index1];
                        var p2x = Xa[index2];
                        var p2y = Ya[index2];
                        if ((p1x > 1 && p1y > 1) && (p2x < 2 || p2y < 2)) {
                            Xa[index2] = p1x;
                            Ya[index2] = p1y;
                            seeds2.push(index2);
                        }
                    }
                }
            }
            //console.log(it, ' count ', seeds2.length)
            seeds1 = seeds2;
            seeds2 = [];
        }

        var end = new Date().getTime();
        console.log('  iterations ', it, '  flood took', end - start, 'ms');

        res1.width = wid;
        res1.height = hei;

        return res1;
    },

    blur: function(xyarray, width, height) {
        var dim = this.checkDimensions(xyarray, width, height);
        width = dim[0];
        height = dim[1];

        var start = new Date().getTime();
        var len = xyarray[0].length;
        var res1 = [new Float32Array(len), new Float32Array(len)];
        var res2 = [new Float32Array(len), new Float32Array(len)];
        var Xa = res1[0];
        var Ya = res1[1];

        var kernel1D = new Float32Array([0.05, 0.09, 0.12, 0.15, 0.16, 0.15, 0.12, 0.09, 0.05]);
        //kernel1D = [0.1,0.2,0.4,0.2,0.1]
        var mid = Math.floor(kernel1D.length / 2);
        //do x
        for (var i = mid * width; i < len - mid * width; i++) {
            var vx = 0;
            var vy = 0;
            if (xyarray[0][i] != 0) {
                for (var k = 0; k < kernel1D.length; k++) {
                    var i2 = i + (k - mid) * width;
                    vx += xyarray[0][i2] * kernel1D[k];
                    vy += xyarray[1][i2] * kernel1D[k];
                }
            }
            res1[0][i] = vx;
            res1[1][i] = vy;
        }
        //do y
        for (i = mid * width; i < len - mid * width; i++) {
            var vx = 0;
            var vy = 0;
            if (xyarray[0][i] != 0) {
                for (var k = 0; k < kernel1D.length; k++) {
                    var i2 = i + (k - mid);
                    vx += res1[0][i2] * kernel1D[k];
                    vy += res1[1][i2] * kernel1D[k];
                }
            }
            res2[0][i] = vx;
            res2[1][i] = vy;
        }

        var end = new Date().getTime();
        console.log('blur took', end - start, 'ms');
        res2.width = width;
        res2.height = height;

        return res2;
    },

    hsvToRgb: function(h, s, v) {
        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
        }

        return [r * 255, g * 255, b * 255];
    },

    drawdata: function(canvas, data, width, height, clamp) {
        //
        // this is basically tuned to the sand table.
        //
        var maxDisp = 10;
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;

        var dim = this.checkDimensions(data, width, height);
        width = dim[0];
        height = dim[1];

        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var projImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var imgdata = projImageData.data;

        for (var i = 0; i < data[0].length; i++) {
            var mIndex = 4 * i;
            var da = data[0][i];
            var db = data[1][i];
            var dm = db; //Math.sqrt(da * da + db * db)
            var h;
            if (clamp) {
                h = (1.7 - (dm / maxDisp + 0.3)) % 1; //just look at y displacement
                if (Math.sqrt(db * db + da * da) > 20) {
                    h = 0.3;
                }
                h = Math.min(1, Math.max(0, h));
                h = Math.floor(h * 30) / 30;
            } else {
                h = (Math.sqrt(da * da + db * db) / (20 * maxDisp) + 0.3) % 1;
            }

            //var h2 = Math.sin(h * Math.PI / 2)
            var rgb = this.hsvToRgb(h, 1, 1);
            //if (da + db > 0 ) {
            imgdata[mIndex + 3] = 255;
            imgdata[mIndex + 2] = rgb[2]; //0//dm
            imgdata[mIndex + 1] = rgb[1]; //(db/maxDisp)*255
            imgdata[mIndex] = rgb[0]; //0//(da + db) * 4;
            //}
            min = Math.min(dm, min);
            max = Math.max(dm, max);
        }

        console.log('max value', max, 'min', min);
        ctx.putImageData(projImageData, 0, 0);
    },

    checkDimensions: function(xyarray, width, height) {
        if (xyarray.width) {
            width = xyarray.width;
            //console.log('found width', wid)
        }
        if (xyarray.height) {
            height = xyarray.height;
            //console.log('found height', hei)
        }
        if (height * width != xyarray[0].length) {
            console.warn('dimension mismatch', width, '*', height, '!=', xyarray[0].length);
        }
        return [width, height];
    },


    /*

     Interactions with the extension
     Im not sure if these really belong here or not
     */
    flatScan: function(flatDoneCallback) {
        var this2 = this;
        AnySurface.Laser.calib(function() { //uggh callback hell
            AnySurface.Laser.getCorr(function(dataurl) {
                console.log('flat callback called');
                this2.flatImg.src = String(dataurl);
                if (flatDoneCallback) {
                    flatDoneCallback();
                }
            });
        });
    },

    mountainScan: function(mountainDoneScan) {
        var this2 = this;
        AnySurface.Laser.calib(function() {
            AnySurface.Laser.getCorr(function(dataurl) {
                this2.moundImg.src = dataurl;
                this2.setup(this2.flatImg.src, this2.moundImg.src, function() {
                    if (mountainDoneScan) {
                        mountainDoneScan(this2.differencesXY);
                    }
                });
            });
        });
    }
};}();
