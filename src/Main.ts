import * as Plugin from "iitcpluginkit";
import imageTarget from "./target-icon.png";
import imageMove from "./move-arrows.png";
import BLANK_IMAGE from "./empty.svg";

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
require("./Leaflet.ImageOverlay.Rotated.js");


interface IOSettings {
    imgUrl: string;
    opacity: number;
    noRotate: boolean;
    firstRun: boolean;
    latlng: [[number, number], [number, number], [number, number]]
}


const enum Marker {
    NW = 0,
    NE = 1,
    SW = 2,
    Move = 3
}



class ImageOverlay2 implements Plugin.Class {


    private markers: [L.Marker, L.Marker, L.Marker, L.Marker];
    private overlay?: L.ImageOverlay;
    private settings: IOSettings = {
        imgUrl: BLANK_IMAGE,
        opacity: 0.5,
        noRotate: false,
        firstRun: true,
        latlng: [[1, 1], [1, 1], [1, 1]]
    }


    init() {
        console.log("ImageOverlay2 " + VERSION);

        this.loadStore();
        this.createMarkers();
        this.createImage();

        window.map.on("layeradd", (event: any) => {
            if (event.layer === this.overlay) {
                this.overlay!.bringToBack();
            }
        });

        this.addToolbar();
    }


    private createMarkers(): void {

        const icon = L.icon({
            iconUrl: imageTarget,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const iconMove = L.icon({
            iconUrl: imageMove,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });


        this.markers = [
            L.marker(L.latLng(this.settings.latlng[0]), { draggable: true, icon })
                .on("drag dragend", event => this.onMarkerMoved(event)),
            L.marker(L.latLng(this.settings.latlng[1]), { draggable: true, icon })
                .on("drag dragend", event => this.onMarkerMoved(event)),
            L.marker(L.latLng(this.settings.latlng[2]), { draggable: true, icon })
                .on("drag dragend", event => this.onMarkerMoved(event)),

            L.marker(L.latLng(0, 0), { draggable: true, icon: iconMove })
                .on("drag dragend", event => this.onMoverDragged(event))
        ];

        this.markers[Marker.Move].setLatLng(this.getCenter());

    }


    private getCenter(): L.LatLng {
        const l1 = this.markers[1].getLatLng();
        const l2 = this.markers[2].getLatLng();

        return L.latLng((l1.lat + l2.lat) / 2, (l1.lng + l2.lng) / 2);
    }



    showMarkers(): void {
        this.markers.forEach(m => m.addTo(window.map));
    }


    hideMarkers(): void {
        this.markers.forEach(m => window.map.removeLayer(m));
    }


    resetMarkerPositions(): void {
        const bounds = window.map.getBounds();

        const dlng = (bounds.getEast() - bounds.getWest()) * 0.4;
        const dlat = (bounds.getSouth() - bounds.getNorth()) * 0.2;

        this.markers[Marker.NW].setLatLng(L.latLng(bounds.getNorth() + dlat, bounds.getWest() + dlng));
        this.markers[Marker.NE].setLatLng(L.latLng(bounds.getNorth() + dlat, bounds.getEast() - dlng));
        this.markers[Marker.SW].setLatLng(L.latLng(bounds.getSouth() - dlat, bounds.getWest() + dlng));

        this.markers[Marker.Move].setLatLng(this.getCenter());

        if (this.overlay) {
            this.repositionImage();
        }
    }

    clearContents(): void {
        this.setNewImage(BLANK_IMAGE);
    }


    onMoverDragged(_event: L.LeafletEvent): void {

        const center = this.getCenter();
        const l0 = this.markers[Marker.Move].getLatLng();
        const dlat = l0.lat - center.lat;
        const dlng = l0.lng - center.lng;

        this.markers.forEach((m, index) => {
            if (index !== Marker.Move) {
                const l = m.getLatLng()
                m.setLatLng(L.latLng(l.lat + dlat, l.lng + dlng));
            }
        });

        this.repositionImage();
    }


    onMarkerMoved(event: L.LeafletEvent): void {

        if (this.settings.noRotate) {
            const l0 = this.markers[Marker.NW].getLatLng();
            const l1 = this.markers[Marker.NE].getLatLng();
            const l2 = this.markers[Marker.SW].getLatLng();

            if (event.target === this.markers[Marker.NW]) {
                l1.lat = l0.lat;
                l2.lng = l0.lng;
            } else if (event.target === this.markers[Marker.NE]) {
                l0.lat = l1.lat;
            } else if (event.target === this.markers[Marker.SW]) {
                l0.lng = l2.lng;
            }

            this.markers[Marker.NW].setLatLng(l0);
            this.markers[Marker.NE].setLatLng(l1);
            this.markers[Marker.SW].setLatLng(l2);
        }


        this.markers[Marker.Move].setLatLng(this.getCenter());
        this.repositionImage();
    }

    repositionImage(): void {
        this.overlay?.reposition(
            this.markers[Marker.NW].getLatLng(),
            this.markers[Marker.NE].getLatLng(),
            this.markers[Marker.SW].getLatLng());
    }


    showDialog(): void {

        const html = $("<table>").append(
            $("<div>").append(
                $("<label>", { for: "file", text: "Image" }),
                $("<input>", { id: "file", type: "file" })
                    .change(() => this.newImageFile())
            ),
            $("<div>").append(
                $("<label>", { for: "imagenoRotate", text: "keep orientation" }),
                $("<input>", { id: "imagenoRotate", type: "checkbox" })
                    .prop("checked", this.settings.noRotate)
                    .change(() => this.onNoRotationChanged())
            ),
            $("<div>").append(
                $("<label>", { for: "opacity", text: "Opacity" }),
                $("<input>", { id: "opacity", type: "range", min: "0", max: "100", class: "slider" })
                    .val(this.settings.opacity * 100)
                    .on("input", event => this.onOpacityChange((event.target as HTMLInputElement).value))
                    .change(event => this.onOpacityChange((event.target as HTMLInputElement).value))
            ),
            $("<div>").append(
                $("<button>", { text: "Reset position" })
                    .click(() => this.resetMarkerPositions())
            ),
            $("<div>").append(
                $("<button>", { text: "Clear image" })
                    .click(() => this.clearContents()),
                $("<p>"),
                $("<span>", { text: 'Large images can\'t be stored and will cost much memory. use "Clear Content" to remove image' })
            )
        );

        dialog({
            html,
            title: "Image Overlay",
            id: "imageOverlay2",
            position: { my: "left center", at: "left+60 center", of: window },
            closeCallback: () => this.onDlgCLose()
        });

        this.showMarkers();

        if (this.settings.firstRun) {
            this.settings.firstRun = false;
            this.resetMarkerPositions();
        }
    }


    onDlgCLose(): void {

        const l0 = this.markers[Marker.NW].getLatLng();
        const l1 = this.markers[Marker.NE].getLatLng();
        const l2 = this.markers[Marker.SW].getLatLng();
        this.settings.latlng[0] = [l0.lat, l0.lng];
        this.settings.latlng[1] = [l1.lat, l1.lng];
        this.settings.latlng[2] = [l2.lat, l2.lng];

        this.saveStore();

        this.hideMarkers();
    }


    newImageFile(): void {
        const files = (document.querySelector("input[type=file]") as HTMLInputElement);
        const file = files.files![0];
        const reader = new FileReader();

        reader.addEventListener("load", () => this.setNewImage(reader.result as string), false);

        if (file) {
            reader.readAsDataURL(file);
        }
    }


    onOpacityChange(value: string): void {
        this.settings.opacity = parseInt(value) / 100;
        if (this.overlay) this.overlay.setOpacity(this.settings.opacity);
    }


    onNoRotationChanged(): void {
        this.settings.noRotate = (document.querySelector("#imagenoRotate") as HTMLInputElement).checked;
        this.onMarkerMoved(<any>{ target: this.markers[Marker.NW] });
    }


    createImage(): void {

        const defImage = this.settings.imgUrl;

        this.overlay = L.imageOverlay.rotated(defImage,
            this.markers[Marker.NW].getLatLng(),
            this.markers[Marker.NE].getLatLng(),
            this.markers[Marker.SW].getLatLng(),
            <any>{
                opacity: this.settings.opacity,
                interactive: false,
                clickable: false // <- sounds good, doesn't work (in v0.7)
            });


        window.addLayerGroup("Image Overlay", <any>this.overlay, true);
        this.overlay.bringToBack();
    }


    setNewImage(imageURL: string) {
        this.settings.imgUrl = imageURL;
        if (this.overlay) this.overlay.setUrl(imageURL);
    }


    addToolbar(): void {
        const prefLink = $('<a href="#">Image</a>')
            .on("click", () => this.showDialog());
        $("#toolbox").append(prefLink);
    }


    loadStore() {
        const dataStr = localStorage.getItem("plugin-imageOverlay2");
        if (dataStr) {
            $.extend(this.settings, JSON.parse(dataStr));
        }
    }

    saveStore() {
        const dataStr = JSON.stringify(this.settings);
        try {
            localStorage.setItem("plugin-imageOverlay2", dataStr);
        } catch {
            console.error("image to big");
            this.settings.imgUrl = BLANK_IMAGE
            const dataStr2 = JSON.stringify(this.settings);
            localStorage.setItem("plugin-imageOverlay2", dataStr2);
        }
    }
}



Plugin.Register(new ImageOverlay2(), "ImageOverlay2");
