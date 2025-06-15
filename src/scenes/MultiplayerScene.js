import { Scene } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";
import { isHost, setState, getState } from "playroomkit";

export class MultiplayerScene extends Scene {
    constructor() {
        super("MultiplayerScene");
        this.lastAnimatedMove = null;
    }

    init(data) {
        this.isHost = isHost();
        this.hostName = data.hostName;
        this.guestName = data.guestName;
    }

    create() {
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

        this.setupBackground();
        this.setupGameBoard();
        this.setupUI();
        this.setupInteraction();
        this.setupGameCore();

        this.time.addEvent({
            delay: 100,
            callback: this.syncFromState,
            callbackScope: this,
            loop: true,
        });
    }

    setupGameCore() {
        this.gameCore = new ConnectFour();

        if (this.isHost) {
            const initialState = this.gameCore.getState();
            initialState.lastMove = null;
            initialState.moveRequest = null;

            setState("game", initialState, true);
        } else {
            const state = getState("game");
            if (state) {
                this.gameCore.setState(state);
            }
        }
    }

    syncFromState() {
        const state = getState("game");
        if (!state) return;

        if (
            this.isHost &&
            state.moveRequest !== null &&
            state.moveRequest !== undefined
        ) {
            const moveRequest = state.moveRequest;
            setState("game", { ...state, moveRequest: null });

            this.processPlayerMove(moveRequest);
            return;
        }

        this.gameCore.setState(state);

        if (state.lastMove && this.shouldAnimateMove(state.lastMove)) {
            this.animateCoinDrop(
                state.lastMove.col,
                state.lastMove.row,
                state.lastMove.player
            );
            this.lastAnimatedMove = { ...state.lastMove };
        }

        if (!this.gameCore.isAnimating && !this.gameCore.gameEnded) {
            this.updateBoard();
            this.updateTurnText();
        }
    }

    shouldAnimateMove(move) {
        return (
            !this.lastAnimatedMove ||
            move.col !== this.lastAnimatedMove.col ||
            move.row !== this.lastAnimatedMove.row ||
            move.player !== this.lastAnimatedMove.player
        );
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

        // this.add
        //     .image(1800, 1000, "backBtn")
        //     .setInteractive({ useHandCursor: true })
        //     .setOrigin(0.5)
        //     .on("pointerdown", () => {
        //         this.time.delayedCall(10, () => {
        //             this.cameras.main.fadeOut(1000);
        //             this.cameras.main.once("camerafadeoutcomplete", () => {
        //                 leaveRoom();
        //                 this.scene.start("MainMenu");
        //             });
        //         });
        //     });
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
                if (!this.gameCore.isAnimating) {
                    this.onColumnClick(col);
                }
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

    onColumnClick(col) {
        if (this.gameCore.gameEnded) return;

        const gameState = getState("game");
        if (!gameState) return;

        const isMyTurn =
            (this.isHost && gameState.currentPlayer === 1) ||
            (!this.isHost && gameState.currentPlayer === 2);

        if (!isMyTurn) {
            return;
        }

        if (this.isHost) {
            this.processPlayerMove(col);
        } else {
            setState("game", { ...gameState, moveRequest: col });
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

    processPlayerMove(col) {
        const move = this.gameCore.dropCoin(col);
        if (!move) {
            console.log(`Invalid move in column ${col}`);
            return;
        }

        if (this.isHost) {
            const currentState = this.gameCore.getState();
            setState("game", {
                ...currentState,
                lastMove: move,
                moveRequest: null,
            });
        }
    }

    animateCoinDrop(col, row, player) {
        const targetY = this.boardTopY + row * this.slotSize;
        const targetX =
            this.boardLeft + col * this.slotSize + this.slotSize / 2;

        const coin = this.add
            .sprite(targetX, 120, "coin", player - 1)
            .setDepth(1)
            .setVisible(true);

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

                this.updateBoard();
                this.updateTurnText();

                this.gameCore.finishAnimation();

                if (this.isHost) {
                    const currentState = this.gameCore.getState();
                    setState("game", currentState);
                }

                const state = getState("game");
                if (state.gameEnded) {
                    this.handleGameOver(state.currentPlayer);
                } else {
                    this.dropZones.forEach((zone) => zone.setInteractive());
                    this.input.enabled = true;
                    this.showPreviewCoin(this.input.activePointer);
                }
                this.sound.stopByKey("coinDrop");
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

        const gameState = getState("game");
        if (!gameState) return;

        const isMyTurn =
            (this.isHost && gameState.currentPlayer === 1) ||
            (!this.isHost && gameState.currentPlayer === 2);
        if (isMyTurn) {
            let coinFrame = gameState.currentPlayer - 1;
            this.previewCoin
                .setPosition(snapX, 120)
                .setFrame(coinFrame)
                .setVisible(true);
        } else {
            this.previewCoin.setVisible(false);
        }
    }

    updateTurnText() {
        const gameState = getState("game");
        if (!gameState) return;

        let playerName;
        let bgColor;
        if (gameState.currentPlayer === 1) {
            playerName = this.hostName;
            bgColor = globals.colors.red600;
        } else if (gameState.currentPlayer === 2) {
            playerName = this.guestName;
            bgColor = globals.colors.black500;
        } else {
            playerName = "Unknown";
            bgColor = globals.colors.black500;
        }

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
                overlay.on("pointerdown", () => {
                    if (this.isHost) {
                        this.gameCore.reset();
                        const resetState = this.gameCore.getState();
                        resetState.lastMove = null;
                        resetState.moveRequest = null;
                        setState("game", resetState);
                    }

                    overlay.destroy();
                    this.restartText.destroy();
                    this.scene.restart();
                });
            },
        });
    }
}
