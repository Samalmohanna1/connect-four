import { Scene } from "phaser";
import globals from "../globals";
import { fadeToScene } from "../fadeToScene";

export class HowTo extends Scene {
    constructor() {
        super("HowTo");
    }

    create() {
        this.cameras.main.fadeIn(1000);
        if (!this.sys.game.device.os.desktop) {
            let lastTap = 0;
            this.input.on("pointerup", (pointer) => {
                let currentTime = pointer.event.timeStamp;
                let tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    if (this.scale.isFullscreen) {
                        this.scale.stopFullscreen();
                    } else {
                        this.scale.startFullscreen();
                    }
                    lastTap = 0;
                } else {
                    lastTap = currentTime;
                }
            });
        }

        this.add.image(globals.centerX, globals.centerY, "howTo");
        const howto = this.add
            .sprite(globals.centerX + 400, globals.centerY, "howToSprite")
            .setScale(1.7);
        howto.play("howTo");

        this.add
            .image(globals.centerX - 430, globals.centerY + 280, "backBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => fadeToScene(this, "MainMenu"));
    }
}
