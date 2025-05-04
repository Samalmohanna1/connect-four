import { Scene } from "phaser";
import globals from "../globals";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        this.add
            .text(
                globals.centerX,
                globals.centerY,
                `Main Menu\n\nClick to Start`,
                globals.bodyTextStyle
            )
            .setAlign("center")
            .setOrigin(0.5);

        this.input.once("pointerdown", () => {
            this.time.delayedCall(10, () => {
                this.cameras.main.fadeOut(1000);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    this.scene.start("GameScene");
                });
            });
        });
    }
}

