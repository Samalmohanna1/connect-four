import { Scene } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";
import { isHost, myPlayer, setState, getState } from "playroomkit";

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
            // Host creates initial state and syncs it
            const initialState = this.gameCore.getState();
            initialState.lastMove = null;
            initialState.moveRequest = null;

            setState("game", initialState, true);
        } else {
            // Client syncs from existing state
            const state = getState("game");
            if (state) {
                this.gameCore.setState(state);
            }
        }
    }

    syncFromState() {
        const state = getState("game");
        if (!state) return;

        // Handle move requests (host only)
        if (
            this.isHost &&
            state.moveRequest !== null &&
            state.moveRequest !== undefined
        ) {
            console.log(
                `Host received move request for column ${state.moveRequest}`
            );

            // Clear the move request immediately to prevent reprocessing
            const moveRequest = state.moveRequest;
            setState("game", { ...state, moveRequest: null });

            this.processPlayerMove(moveRequest);
            return; // Exit early to prevent state conflicts
        }

        // Update local game state using ConnectFour's built-in method
        this.gameCore.setState(state);

        // Handle animations
        if (state.lastMove && this.shouldAnimateMove(state.lastMove)) {
            this.animateCoinDrop(
                state.lastMove.col,
                state.lastMove.row,
                state.lastMove.player
            );
            this.lastAnimatedMove = { ...state.lastMove };
        }

        // Update UI if not animating
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

    // setupBackground() - UNCHANGED
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

    // setupGameBoard() - UNCHANGED
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
        this.turnText = this.add
            .text(
                200,
                80,
                `Player ${this.gameCore?.currentPlayer || 1}'s Turn`,
                globals.bodyTextStyle
            )
            .setOrigin(0.5);
    }

    // setupInteraction() - UNCHANGED (except removal of unused isAnimating check)
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
            console.log("Not your turn!");
            return;
        }

        if (this.isHost) {
            this.processPlayerMove(col);
        } else {
            setState("game", { ...gameState, moveRequest: col });
        }
    }

    processPlayerMove(col) {
        console.log(`before move: Player ${this.gameCore.currentPlayer}`);
        const move = this.gameCore.dropCoin(col);
        if (!move) {
            console.log(`Invalid move in column ${col}`);
            return;
        }

        if (this.isHost) {
            // Use ConnectFour's getState method for consistency
            const currentState = this.gameCore.getState();
            setState("game", {
                ...currentState,
                lastMove: move,
                moveRequest: null, // Ensure it's cleared
            });
            console.log("Host updated game state");
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

                // Use ConnectFour's finishAnimation method
                this.gameCore.finishAnimation();

                // Sync the animation state
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
            },
        });
    }

    // showPreviewCoin() - UNCHANGED
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
        if (gameState.currentPlayer === 1) {
            playerName = this.hostName;
        } else if (gameState.currentPlayer === 2) {
            playerName = this.guestName;
        } else {
            playerName = "Unknown";
        }

        this.turnText.setText(`${playerName}'s Turn`);
    }

    updateBoard() {
        this.gameCore.board.forEach((col, colIndex) => {
            col.forEach((cell, rowIndex) => {
                this.slots[colIndex][rowIndex].setFrame(cell);
            });
        });
    }

    // drawWinLine() - UNCHANGED
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
                    ? `${this.hostName} Wins!`
                    : `${this.guestName} Wins!`
            )
            .setDepth(60)
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

        console.log(
            `Game over! ${winner === 0 ? "Draw" : "Player " + winner + " won"}`
        );

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 2000,
            ease: "Linear",
            onComplete: () => {
                this.turnText.setVisible(true);
                this.restartText.setVisible(true);
                overlay.on("pointerdown", () => {
                    console.log("Game restarting...");

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
