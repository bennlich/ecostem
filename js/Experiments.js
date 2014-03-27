'use strict';

function computeQuad(sampler) {
    var height = sampler.canvas.height;
    var width = sampler.canvas.width;

    var canvas = document.getElementById('quadCanvas');

    canvas.height = Math.floor(height);
    canvas.width = Math.floor(width);

    var ctx = canvas.getContext('2d');

    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,width,height);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    doQuad(ctx,sampler,0,0,width,height);
}

function drawLine(ctx, x1,y1,x2,y2) {
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);
    x2 = Math.floor(x2);
    y2 = Math.floor(y2);
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}

function doQuad(ctx, sampler, x, y, width, height) {
    var min=1000000, max=0;

    for (var i = x; i < x+width; ++i) {
        for (var j = y; j < y+height; ++j) {
            var val = sampler.sample(i,j);
            if (val < min)
                min = val;
            if (val > max)
                max = val;
        }
    }

    if (max - min > 40) {
        drawLine(ctx, x+width/2, y, x+width/2, y+height);
        drawLine(ctx, x, y+height/2, x+width, y+height/2);

        var w = width/2,
            h = height/2;

        doQuad(ctx,sampler,x,y,w,h);
        doQuad(ctx,sampler,x+w,y,w,h);
        doQuad(ctx,sampler,x,y+h,w,h);
        doQuad(ctx,sampler,x+w,y+h,w,h);
    }
}
