import { Scene } from "phaser";
import globals from "../globals";
import { insertCoin, onPlayerJoin, setState, isHost } from "playroomkit";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    hasPlayroomRoomInUrl() {
        return window.location.hash.includes("r=");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        if (isHost()) {
            setState("leftGame", false, true);
        }

        this.hostName = "host";
        this.guestName = "guest";
        if (this.hasPlayroomRoomInUrl()) {
            this.launchMultiplayer();
        }

        this.add.image(globals.centerX, globals.centerY, "title");
        this.add
            .image(
                globals.centerX - 620,
                globals.centerY + 100,
                "singlePlayerBtn"
            )
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
            .image(
                globals.centerX - 210,
                globals.centerY + 100,
                "multiPlayerBtn"
            )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", async () => {
                await this.launchMultiplayer();
            });

        this.add
            .image(globals.centerX - 410, globals.centerY + 250, "howToBtn")
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
    async launchMultiplayer() {
        try {
            await insertCoin({ maxPlayersPerRoom: 2 });

            const players = [];
            const removeListener = onPlayerJoin((player) => {
                player.setState("leftGame", false);
                players.push(player);

                if (players.length === 2) {
                    const hostPlayer =
                        players.find((p) => p.isHost) || players[1];
                    const guestPlayer = players.find((p) => p !== hostPlayer);

                    const hostName = hostPlayer.getProfile().name || "Host";
                    const guestName = guestPlayer.getProfile().name || "Guest";

                    removeListener(); // Clean up
                    this.scene.start("MultiplayerScene", {
                        hostName,
                        guestName,
                    });
                }
            });
        } catch (error) {
            console.error("Playroom init failed:", error);
        }
    }
}
