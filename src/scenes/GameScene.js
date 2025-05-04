import { Scene } from "phaser";
import globals from "../globals";

export class GameScene extends Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        this.cameras.main.fadeIn(1000);
        this.add
            .text(
                globals.centerX,
                globals.centerY,
                `Game Scene\n\nClick to End`,
                globals.bodyTextStyle
            )
            .setAlign("center")
            .setOrigin(0.5);
        this.input.on("pointerdown", () => {
            this.gameOver();
        });
    }

    gameOver() {
        this.time.delayedCall(10, () => {
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("GameOver");
            });
        });
    }
}

