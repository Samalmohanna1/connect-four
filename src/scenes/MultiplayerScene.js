import { Scene } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";
import { isHost, setState, getState, onPlayerJoin, RPC } from "playroomkit";

// Only the host writes the shared "game" state. The guest sends its moves and
// rematch requests to the host over RPC, and both clients animate a move when
// they see moveCount go up.
export class MultiplayerScene extends Scene {
    constructor() {
        super("MultiplayerScene");
        this.fullscreen = false;
    }

    init(data) {
        this.isHost = isHost();
        this.myPlayerNumber = this.isHost ? 1 : 2;
        this.hostName = data.hostName;
        this.guestName = data.guestName;
    }

    create() {
        // The scene instance is reused on restart, so reset per-game fields here.
        this.round = null;
        this.shownMoveCount = 0;
        this.isDropping = false;
        this.isGameOver = false;
        this.hasLeft = false;

        if (!this.sys.game.device.os.desktop) {
            this.add
                .image(1700, 930, "fsBtn")
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5)
                .setScale(0.6)
                .setDepth(60)
                .on("pointerdown", () => {
                    if (!this.fullscreen) {
                        this.scale.startFullscreen();
                        this.fullscreen = true;
                    } else {
                        this.scale.stopFullscreen();
                        this.fullscreen = false;
                    }
                });
        }
        this.setupBackground();
        this.setupGameBoard();
        this.setupUI();
        this.setupInteraction();
        this.setupGameCore();
        this.setupNetworking();

        this.time.addEvent({
            delay: 100,
            callback: this.syncFromState,
            callbackScope: this,
            loop: true,
        });
    }

    update() {
        if (getState("leftGame")) {
            this.leaveGame();
        }
    }

    leaveGame() {
        if (this.hasLeft) return;
        this.hasLeft = true;
        this.scene.start("PlayerDisconnect");
    }

    setupGameCore() {
        this.gameCore = new ConnectFour();

        if (this.isHost) {
            // Each new game is a new round, so the guest knows to restart too.
            this.round = (getState("game")?.round ?? 0) + 1;
            this.publishState();
        }
    }

    setupNetworking() {
        const cleanups = [];

        // onPlayerJoin also fires for players already in the room, so the quit
        // listeners are attached again after every rematch restart.
        cleanups.push(
            onPlayerJoin((player) => {
                cleanups.push(player.onQuit(() => this.leaveGame()));
            })
        );

        if (this.isHost) {
            cleanups.push(
                RPC.register("move", async (col) => {
                    this.applyMove(col, 2);
                }),
                RPC.register("rematch", async () => {
                    this.startRematch();
                })
            );
        }

        this.events.once("shutdown", () => {
            cleanups.forEach((cleanup) => cleanup());
        });
    }

    publishState() {
        setState("game", { ...this.gameCore.getState(), round: this.round });
    }

    syncFromState() {
        const state = getState("game");
        if (!state) return;

        if (!this.isHost) {
            if (this.round === null) this.round = state.round;

            // The host started a rematch.
            if (state.round !== this.round) {
                this.scene.restart();
                return;
            }
        }

        if (this.isDropping || this.isGameOver) return;

        this.gameCore.setState(state);

        if (state.moveCount > this.shownMoveCount) {
            this.shownMoveCount = state.moveCount;
            const { col, row } = state.lastMove;

            // Show every coin except the one about to fall into place.
            this.updateBoard();
            this.slots[col][row].setFrame(0);
            this.animateCoinDrop(state.lastMove);
        } else {
            this.updateBoard();
            this.updateTurnText();
        }
    }

    setupBackground() {
        this.add.image(globals.centerX, globals.centerY, "gameBg");
        this.coffee = this.add.sprite(240, 900, "coffee");
        this.add.image(1760, 230, "hangingPlant");
        const sky = this.add.image(2220, 200, "sky").setDepth(-1);

        this.coffee.play("coffee");
        this.skyTween = this.tweens.add({
            targets: sky,
            x: "-=1100",
            duration: 35000,
            repeat: -1,
        });
    }

    setupGameBoard() {
        this.slotSize = 117;
        this.cols = 7;
        this.rows = 6;
        this.boardWidth = this.cols * this.slotSize;
        this.boardHeight = this.rows * this.slotSize;
        this.boardLeft = globals.centerX - this.boardWidth / 2;
        this.boardRight = this.boardLeft + this.boardWidth;
        this.boardTop = globals.centerY - this.boardHeight / 2;
        this.boardTopY =
            globals.centerY -
            (this.rows * this.slotSize) / 2 +
            this.slotSize / 2;

        this.boardFrame = this.add
            .image(globals.centerX, globals.centerY + 57, "boardFrame")
            .setDepth(2);

        this.slots = [];
        for (let col = 0; col < this.cols; col++) {
            this.slots[col] = [];
            for (let row = 0; row < this.rows; row++) {
                const x =
                    this.boardLeft + col * this.slotSize + this.slotSize / 2;
                const y =
                    this.boardTop + row * this.slotSize + this.slotSize / 2;
                this.slots[col][row] = this.add
                    .sprite(x, y, "slot", 0)
                    .setDepth(2);
            }
        }

        this.winLine = this.add.graphics();
        this.winLine.setDepth(40);
    }

    setupUI() {
        const bgColor = globals.colors.red600;

        this.turnText = this.add.text(
            0,
            0,
            `Player ${this.gameCore?.currentPlayer || 1}'s turn`,
            {
                ...globals.turnTextStyle,
                backgroundColor: bgColor,
            }
        );

        this.add
            .image(1700, 1020, "backBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .setScale(0.6)
            .on("pointerdown", () => {
                setState("leftGame", true, true);
                this.leaveGame();
            });
    }

    setupInteraction() {
        this.dropZones = [];
        for (let col = 0; col < this.cols; col++) {
            const zone = this.add
                .rectangle(
                    this.boardLeft + col * this.slotSize + this.slotSize / 2,
                    globals.centerY,
                    this.slotSize,
                    this.boardHeight,
                    0xffffff,
                    0
                )
                .setInteractive({ useHandCursor: true });
            zone.column = col;
            zone.on("pointerdown", (pointer) => {
                this.showPreviewCoin(pointer);
                this.onColumnClick(col);
            });
            this.dropZones.push(zone);
        }

        this.previewCoin = this.add
            .sprite(0, 0, "coin", 0)
            .setVisible(false)
            .setDepth(1);
        this.columnHighlight = this.add.graphics();
        this.columnHighlight.setVisible(false);

        this.input.on("pointermove", (pointer) => {
            if (this.gameCore.gameEnded) return;
            this.showPreviewCoin(pointer);
        });
    }

    isMyTurn() {
        return (
            !this.gameCore.gameEnded &&
            !this.isDropping &&
            this.gameCore.currentPlayer === this.myPlayerNumber
        );
    }

    onColumnClick(col) {
        if (!this.isMyTurn()) return;

        if (this.isHost) {
            this.applyMove(col, this.myPlayerNumber);
        } else {
            RPC.call("move", col, RPC.Mode.HOST);
        }
    }

    // Host only.
    applyMove(col, player) {
        if (player !== this.gameCore.currentPlayer) return;
        if (!this.gameCore.dropCoin(col)) return;
        this.publishState();
    }

    // Host only. Restarting publishes a new round, which restarts the guest.
    startRematch() {
        if (!this.gameCore.gameEnded) return;
        this.scene.restart();
    }

    requestRematch() {
        if (this.isHost) {
            this.startRematch();
        } else {
            RPC.call("rematch", null, RPC.Mode.HOST);
        }
    }

    playCoinDrop() {
        const coinDropSound = this.sound.get("coinDrop");
        if (!coinDropSound || !coinDropSound.isPlaying) {
            this.sound.play("coinDrop", {
                volume: 0.7,
                rate: 1.1,
            });
        }
    }

    animateCoinDrop({ col, row, player }) {
        const targetY = this.boardTopY + row * this.slotSize;
        const targetX =
            this.boardLeft + col * this.slotSize + this.slotSize / 2;

        const coin = this.add
            .sprite(targetX, 120, "coin", player - 1)
            .setDepth(1)
            .setVisible(true);

        this.isDropping = true;
        this.previewCoin.setVisible(false);
        this.input.enabled = false;
        this.dropZones.forEach((zone) => zone.disableInteractive());

        this.playCoinDrop();
        this.tweens.add({
            targets: coin,
            y: targetY,
            duration: 700,
            ease: "Bounce.easeOut",
            onComplete: () => {
                this.slots[col][row].setFrame(player);
                coin.destroy();
                this.isDropping = false;
                this.sound.stopByKey("coinDrop");

                // On the host, gameCore may already hold a newer move that
                // arrived mid-drop; that move is animated on the next sync.
                const isFinalMove =
                    this.gameCore.gameEnded &&
                    this.gameCore.moveCount === this.shownMoveCount;

                if (isFinalMove) {
                    this.handleGameOver(this.gameCore.winner);
                } else {
                    this.updateTurnText();
                    this.dropZones.forEach((zone) => zone.setInteractive());
                    this.input.enabled = true;
                    this.showPreviewCoin(this.input.activePointer);
                }
            },
        });
    }

    showPreviewCoin(pointer) {
        if (this.gameCore.gameEnded) return;

        const minX = this.boardLeft + 95 / 2;
        const maxX = this.boardRight - 95 / 2;
        const x = Phaser.Math.Clamp(pointer.x, minX, maxX);

        const col = Math.floor((x - this.boardLeft) / this.slotSize);
        const snapX = this.boardLeft + col * this.slotSize + this.slotSize / 2;

        if (this.isMyTurn()) {
            this.previewCoin
                .setPosition(snapX, 120)
                .setFrame(this.myPlayerNumber - 1)
                .setVisible(true);
        } else {
            this.previewCoin.setVisible(false);
        }
    }

    updateTurnText() {
        const isHostTurn = this.gameCore.currentPlayer === 1;
        const playerName = isHostTurn ? this.hostName : this.guestName;
        const bgColor = isHostTurn
            ? globals.colors.red600
            : globals.colors.black500;

        this.turnText.setText(`${playerName}'s turn`);
        this.turnText.setStyle({ backgroundColor: bgColor });
    }

    updateBoard() {
        this.gameCore.board.forEach((col, colIndex) => {
            col.forEach((cell, rowIndex) => {
                this.slots[colIndex][rowIndex].setFrame(cell);
            });
        });
    }

    drawWinLine(positions) {
        this.winLine.clear();
        this.winLine.lineStyle(16, 0xf5f3ef, 1.0);

        const boardStartX =
            globals.centerX - (7 * this.slotSize) / 2 + this.slotSize / 2;
        const boardStartY =
            globals.centerY - (6 * this.slotSize) / 2 + this.slotSize / 2;

        const first = positions[0];
        const last = positions[positions.length - 1];
        const x1 = boardStartX + first.col * this.slotSize;
        const y1 = boardStartY + first.row * this.slotSize;
        const x2 = boardStartX + last.col * this.slotSize;
        const y2 = boardStartY + last.row * this.slotSize;

        this.winLine.beginPath();
        this.winLine.moveTo(x1, y1);
        this.winLine.lineTo(x2, y2);
        this.winLine.strokePath();
        this.winLine.setVisible(true);
    }

    handleGameOver(winner) {
        this.isGameOver = true;
        this.previewCoin.setVisible(false);
        this.dropZones.forEach((zone) => zone.disableInteractive());
        this.columnHighlight.setVisible(false);
        this.input.enabled = true;
        this.coffee.stop();
        this.skyTween.stop();

        if (winner !== 0) {
            this.drawWinLine(this.gameCore.winPositions);
        }

        const overlay = this.add
            .rectangle(
                globals.centerX,
                globals.centerY,
                1920,
                1080,
                globals.colors.black600,
                0.8
            )
            .setDepth(50)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.1);

        this.turnText
            .setText(
                winner === 0
                    ? "Game Over: Draw!"
                    : winner === 1
                    ? `${this.hostName} wins!`
                    : `${this.guestName} wins!`
            )
            .setDepth(60)
            .setOrigin(0.5)
            .setX(globals.centerX)
            .setY(globals.centerY - 450)
            .setStyle(globals.overlayTextStyle);

        this.restartText = this.add
            .text(
                globals.centerX,
                globals.centerY - 300,
                "Click anywhere to play again",
                globals.overlayTextStyle
            )
            .setOrigin(0.5)
            .setDepth(60)
            .setVisible(false);

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
                this.turnText.setVisible(true);
                this.restartText.setVisible(true);
                overlay.on("pointerdown", () => this.requestRematch());
            },
        });
    }
}
