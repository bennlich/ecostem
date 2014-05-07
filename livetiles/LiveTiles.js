import {LiveTexture} from '../st-api/LiveTexture';

$(document).ready(function() {
    "use strict";

    var map = new L.Map('map',{
        minZoom: 3,
        maxZoom: 15
    });

    map.setView(new L.LatLng(36.42835637785987, -105.633544921875), 12);
    map.addLayer(new L.TileLayer('http://{s}.tiles.mapbox.com/v3/bennlich.hmi0c6k3/{z}/{x}/{y}.png'));

    var liveTexture = new LiveTexture(map);

    liveTexture.onLayerAppeared(function(id, name) {
        if (!name)
        return;

        $('#layers').append(
            ('<div id="{0}">'
            +  '<input id="cb{0}" type="checkbox"></input>&nbsp;'
            +  '<label for="cb{0}">{1}</label>'
            +  '<a style="float:right;">pan</a>'
            +'</div>').format(id, name)
        );
    });

    liveTexture.onLayerDisappeared(function(id, name, layer) {
        map.removeLayer(layer);
        $('#' + id).remove();
    });

    $(document).on('click', 'input[type=checkbox]', function() {
        var checked = $(this).prop('checked'),
        id = $(this).parent().attr('id'),
        layer = liveTexture.findLayer(id);

        if (checked)
            map.addLayer(layer);
        else
            map.removeLayer(layer);
    });

    $(document).on('click', 'a', function() {
        var id = $(this).parent().attr('id'),
        bbox = liveTexture.findBBox(id);
        map.fitBounds(bbox);
    });
});
