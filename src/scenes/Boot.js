import { Scene } from "phaser";

export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        this.load.image("studioLogo", "assets/studio-logo.webp");
    }

    create() {
        this.scene.start("Preloader");
    }
}
