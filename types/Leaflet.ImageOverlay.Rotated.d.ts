/* eslint-disable unicorn/filename-case */

declare namespace L {

    export interface ImageOverlay {
        reposition(topleft: L.LatLngExpression, topright: L.LatLngExpression, bottomleft: L.LatLngExpression): void;
    }

    namespace imageOverlay {
        function rotated(
            imgSource: string | HTMLImageElement | HTMLCanvasElement,
            topleft: L.LatLngExpression, topright: L.LatLngExpression, bottomleft: L.LatLngExpression, options?: L.ImageOverlayOptions): L.ImageOverlay;
    }
}
