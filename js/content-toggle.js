/* global MINITAB_HIGHLIGHTED:true
        , MINITAB_PORT
        , MINITAB_UPDATE_OVERLAYS */

MINITAB_HIGHLIGHTED = !MINITAB_HIGHLIGHTED;

if (MINITAB_HIGHLIGHTED) {
    MINITAB_PORT.postMessage({type: 'init'});
} else
    MINITAB_UPDATE_OVERLAYS();
