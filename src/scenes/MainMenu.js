import { Scene } from "phaser";
import globals from "../globals";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        this.add.image(globals.centerX, globals.centerY, "title");
        this.add
            .image(globals.centerX - 430, globals.centerY + 120, "startBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => {
                this.time.delayedCall(10, () => {
                    this.cameras.main.fadeOut(1000);
                    this.cameras.main.once("camerafadeoutcomplete", () => {
                        this.scene.start("GameScene");
                    });
                });
            });
        this.add
            .image(globals.centerX - 430, globals.centerY + 280, "howToBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => {
                this.time.delayedCall(10, () => {
                    this.cameras.main.fadeOut(1000);
                    this.cameras.main.once("camerafadeoutcomplete", () => {
                        this.scene.start("HowTo");
                    });
                });
            });
    }
}
