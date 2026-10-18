import { Scene } from "phaser";
import globals from "../globals";
import {
    insertCoin,
    onPlayerJoin,
    setState,
    isHost,
    myPlayer,
} from "playroomkit";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    hasPlayroomRoomInUrl() {
        return window.location.hash.includes("r=");
    }

    create() {
        this.cameras.main.fadeIn(1000);
        this.joiningMultiplayer = false;

        if (isHost()) {
            setState("leftGame", false, true);
        }

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
        if (this.joiningMultiplayer) return;
        this.joiningMultiplayer = true;

        try {
            await insertCoin({ maxPlayersPerRoom: 2 });

            const players = [];
            const removeListener = onPlayerJoin((player) => {
                players.push(player);

                if (players.length === 2) {
                    // PlayerState has no isHost flag, so work out the roles
                    // from this client's point of view.
                    const me = myPlayer();
                    const opponent = players.find((p) => p.id !== me.id);
                    const [hostPlayer, guestPlayer] = isHost()
                        ? [me, opponent]
                        : [opponent, me];

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
            this.joiningMultiplayer = false;
        }
    }
}
