import { Scene } from "phaser";
import globals from "../globals";

export class GameOver extends Scene {
    constructor() {
        super("GameOver");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        this.add
            .text(
                globals.centerX,
                globals.centerY,
                `Game Over\n\nClick to Restart`,
                globals.bodyTextStyle
            )
            .setAlign("center")
            .setOrigin(0.5);

        this.input.once("pointerdown", () => {
            this.time.delayedCall(10, () => {
                this.cameras.main.fadeOut(1000);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    this.scene.start("MainMenu");
                });
            });
        });
    }
}

