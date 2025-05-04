import { Scene } from "phaser";
import globals from "../globals";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    init() {
        const logo = this.add.image(
            globals.centerX,
            globals.centerY - 100,
            "studioLogo"
        );
        logo.setOrigin(0.5);

        this.tweens.add({
            targets: logo,
            y: "+=10",
            duration: 700,
            yoyo: true,
            repeat: -1,
        });
    }

    preload() {
        this.load.setPath("assets");
    }

    create() {
        //  When all the assets have loaded, Spritesheet animations that are used in the game can be made here.

        this.time.delayedCall(1000, () => {
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("MainMenu");
            });
        });
    }
}

