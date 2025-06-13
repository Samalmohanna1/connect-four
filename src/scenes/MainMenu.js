import { Scene } from "phaser";
import globals from "../globals";
import { insertCoin, onPlayerJoin } from "playroomkit";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    hasPlayroomRoomInUrl() {
        return window.location.hash.includes("r=");
    }

    create() {
        this.cameras.main.fadeIn(1000);

        if (!this.sys.game.device.os.desktop) {
            let rotateText;
            if (!this.sys.game.scale.isLandscape) {
                rotateText = this.add
                    .text(
                        this.scale.width / 2,
                        140,
                        `Rotate your device and double tap to toggle fullscreen on/off.`,
                        {
                            ...globals.bodyTextStyle,
                            backgroundColor: "#ffffef",
                            padding: { x: 20, y: 20 },
                        }
                    )
                    .setOrigin(0.5)
                    .setDepth(20);
            } else if (this.sys.game.scale.isLandscape) {
                rotateText = this.add
                    .text(
                        this.scale.width / 2,
                        140,
                        `Double tap to toggle fullscreen on/off.`,
                        {
                            ...globals.bodyTextStyle,
                            backgroundColor: "#ffffef",
                            padding: { x: 20, y: 20 },
                        }
                    )
                    .setOrigin(0.5)
                    .setDepth(20);
            }

            let lastTap = 0;
            this.input.on("pointerup", (pointer) => {
                let currentTime = pointer.event.timeStamp;
                let tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                    rotateText.setVisible(false);
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

        this.hostName = "host";
        this.guestName = "guest";
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
                        this.scene.start("GameScene");
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
    async launchMultiplayer() {
        try {
            await insertCoin({ maxPlayersPerRoom: 2 });

            const players = [];
            const removeListener = onPlayerJoin((player) => {
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
