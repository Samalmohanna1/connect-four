import { Scene } from "phaser";
import globals from "../globals";

export class PlayerDisconnect extends Scene {
    constructor() {
        super("PlayerDisconnect");
    }

    create() {
        this.add
            .text(
                this.scale.width / 2,
                this.scale.height / 2,
                "A player disconnected. Returning to lobby...",
                globals.overlayTextStyle
            )
            .setOrigin(0.5)
            .setDepth(100);
        this.time.delayedCall(2000, () => {
            window.history.replaceState({}, document.title, "/");
            window.location.reload();
            this.scene.start("MainMenu");
        });
    }
}
