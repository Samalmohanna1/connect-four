import { Scene } from "phaser";
import globals from "../globals";
import { fadeToScene } from "../fadeToScene";

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

        this.add.image(globals.centerX, globals.centerY, "title");
        this.add
            .image(
                globals.centerX - 620,
                globals.centerY + 100,
                "singlePlayerBtn"
            )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => fadeToScene(this, "GameScene"));
        this.multiplayerBtn = this.add
            .image(
                globals.centerX - 210,
                globals.centerY + 100,
                "multiPlayerBtn"
            )
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => this.launchMultiplayer());

        this.add
            .image(globals.centerX - 410, globals.centerY + 250, "howToBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on("pointerdown", () => fadeToScene(this, "HowTo"));

        if (this.hasPlayroomRoomInUrl()) {
            this.launchMultiplayer();
        }
    }

    async launchMultiplayer() {
        if (this.joiningMultiplayer) return;
        this.joiningMultiplayer = true;
        // Dimmed while multiplayer downloads, which can take a moment.
        this.multiplayerBtn.setAlpha(0.6);

        try {
            // Playroom, and the React it draws its lobby with, are about half
            // of the game's JavaScript, so they only load for multiplayer.
            const [
                { insertCoin, onPlayerJoin, setState, isHost, myPlayer },
                { MultiplayerScene },
            ] = await Promise.all([
                import("playroomkit"),
                import("./MultiplayerScene"),
            ]);
            if (!this.scene.get("MultiplayerScene")) {
                this.scene.add("MultiplayerScene", MultiplayerScene);
            }

            await insertCoin({ maxPlayersPerRoom: 2 });

            if (isHost()) {
                setState("leftGame", false, true);
            }

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
            this.multiplayerBtn.setAlpha(1);
        }
    }
}
