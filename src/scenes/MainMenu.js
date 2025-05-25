import { Scene } from "phaser";
import globals from "../globals";
import { insertCoin } from "playroomkit";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    hasPlayroomRoomInUrl() {
        return window.location.hash.includes("r=");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        if (this.hasPlayroomRoomInUrl()) {
            this.launchMultiplayer();
        }

        this.add.image(globals.centerX, globals.centerY, "title");
        this.add
            .image(
                globals.centerX - 420,
                globals.centerY + 60,
                "singlePlayerBtn"
            )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => {
                this.time.delayedCall(10, () => {
                    this.cameras.main.fadeOut(1000);
                    this.cameras.main.once("camerafadeoutcomplete", () => {
                        this.scene.start("GameScene", { mode: "singleplayer" });
                    });
                });
            });
        this.add
            .image(
                globals.centerX - 420,
                globals.centerY + 180,
                "multiPlayerBtn"
            )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", async () => {
                await this.launchMultiplayer();
            });

        this.add
            .image(globals.centerX - 420, globals.centerY + 300, "howToBtn")
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
    launchMultiplayer() {
        insertCoin({ maxPlayersPerRoom: 2 });
        this.scene.start("GameScene", { mode: "multiplayer" });
    }
}
