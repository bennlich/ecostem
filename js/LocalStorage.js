'use strict';

var LocalStorage = {
    filer: new Filer(),

    filerOnError: function(e) {
        console.log('Error');
        console.log('Filer Error: ', e.name);
    },

    initialized: function(callback) {
        var filer = this.filer,
            filerOnError = this.filerOnError;

        filer.init({persistent: false, size: 1024*1024*20}, function(fs) {
            callback(filer);
        }, filerOnError);
    },

    withDir: function(dir, callback) {
        var filerOnError = this.filerOnError;

        this.initialized(function(filer) {
            filer.ls(dir, function() {
                console.log('found dir', dir);
                callback(dir);
            }, function() {
                console.log('creating dir', dir);
                filer.mkdir(dir);
                callback(dir);
            });
        });
    },

    dirGetFile: function(dir, fileName, successCallback, notFoundCallback) {
        this.initialized(function(filer) {
            filer.ls(dir, function(contents) {
                var cachedFile = _.find(contents, function(c) {
                    return c.isFile && c.name === fileName;
                });
                
                if (cachedFile) {
                    console.log('found file', dir, cachedFile.name);
                    successCallback(cachedFile);
                } else {
                    console.log('file not found', dir, fileName);
                    notFoundCallback();
                }
            });
        });
    },

    readFileAsByteArray: function(fileObj, callback) {
        var filerOnError = this.filerOnError;

        this.initialized(function(filer) {
            filer.open(fileObj.fullPath, function(file) {
                var reader = new FileReader();
                reader.onload = function(data) {
                    callback(new Uint8Array(reader.result));
                };
                reader.readAsArrayBuffer(file);
            }, filerOnError);
        });
    },

    writeFile: function(filePath, data, callback) {
        var filerOnError = filerOnError;

        this.initialized(function(filer) {
            filer.write(filePath, {data: data}, callback);
        }, filerOnError);
    }
};
