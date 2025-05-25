import { Scene } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";
import { isHost, myPlayer, setState, getState } from "playroomkit";

export class GameScene extends Scene {
    constructor() {
        super("GameScene");
        this.lastAnimatedMove = null;
    }

    init(data) {
        this.gameMode = data.mode || "singleplayer";
        this.isHost = isHost();
    }

    create() {
        this.setupBackground();
        this.setupGameBoard();
        this.setupUI();
        this.setupInteraction();

        this.setupGameCore();

        if (this.gameMode === "multiplayer") {
            this.time.addEvent({
                delay: 100,
                callback: this.syncFromState,
                callbackScope: this,
                loop: true,
            });
        }
    }

    setupGameCore() {
        if (this.gameMode === "multiplayer") {
            const initialGameState = {
                board: Array.from({ length: 7 }, () => Array(6).fill(0)),
                currentPlayer: 1,
                gameEnded: false,
                winPositions: [],
                lastMove: null,
            };

            this.gameCore = new ConnectFour();

            if (this.isHost) {
                setState("game", initialGameState, true);
            } else {
                const state = getState("game");
                if (state) {
                    this.loadState(state);
                }
            }
        } else {
            this.gameCore = new ConnectFour(this.cols, this.rows);
        }
    }

    loadState(state) {
        if (!state) return;

        this.gameCore.board = state.board.map((col) => [...col]);
        this.gameCore.currentPlayer = state.currentPlayer;
        this.gameCore.gameEnded = state.gameEnded;
        this.gameCore.winPositions = state.winPositions || [];
    }

    syncFromState() {
        const state = getState("game");
        if (!state) return;

        const hasStateChanged =
            JSON.stringify(state.board) !==
                JSON.stringify(this.gameCore.board) ||
            state.currentPlayer !== this.gameCore.currentPlayer ||
            state.gameEnded !== this.gameCore.gameEnded;

        if (hasStateChanged) {
            const prevPlayer = this.gameCore.currentPlayer;
            this.loadState(state);

            if (
                state.lastMove &&
                (!this.lastAnimatedMove ||
                    state.lastMove.col !== this.lastAnimatedMove.col ||
                    state.lastMove.row !== this.lastAnimatedMove.row ||
                    state.lastMove.player !== this.lastAnimatedMove.player)
            ) {
                this.animateCoinDrop(state.lastMove.col);
                this.lastAnimatedMove = { ...state.lastMove };
            }

            if (prevPlayer !== state.currentPlayer) {
                console.log(
                    `Turn changed: Player ${state.currentPlayer}'s turn (multiplayer sync)`
                );
            }

            this.updateBoard();
            this.updateTurnText();

            if (state.gameEnded) {
                this.handleGameOver(state.currentPlayer);
            }
        }

        if (this.isHost && state.moveRequest !== undefined) {
            this.processPlayerMove(state.moveRequest);
            setState("game", { ...getState("game"), moveRequest: undefined });
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
        this.turnText = this.add
            .text(
                200,
                80,
                `Player ${this.gameCore?.currentPlayer || 1}'s Turn`,
                globals.bodyTextStyle
            )
            .setOrigin(0.5);
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
            // zone.on("pointerover", () => this.highlightColumn(col));
            // zone.on("pointerout", () => this.unhighlightColumn(col));
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

        if (this.gameMode === "multiplayer") {
            const gameState = getState("game");
            if (!gameState) return;

            const isMyTurn =
                (this.isHost && gameState.currentPlayer === 1) ||
                (!this.isHost && gameState.currentPlayer === 2);

            if (!isMyTurn) {
                console.log(`Column click rejected: Not player's turn`);
                return;
            }

            if (this.isHost) {
                console.log(`Host clicked column ${col}`);
                this.processPlayerMove(col);
            } else {
                console.log(`Guest requested move in column ${col}`);
                setState("game", {
                    ...gameState,
                    moveRequest: col,
                });
                console.log(
                    "update state after guest move request: ",
                    getState("game")
                );
            }
        } else {
            console.log(
                `Singleplayer: Player ${this.gameCore.currentPlayer} selected column ${col}`
            );
            this.animateCoinDrop(col);
        }
    }

    processPlayerMove(col) {
        const move = this.gameCore.dropCoin(col);
        if (!move) {
            console.log(`Invalid move in column ${col}`);
            return;
        }

        console.log(
            `Processing move: Player ${this.gameCore.currentPlayer} dropped coin at column ${move.col}, row ${move.row}`
        );

        const win = this.gameCore.checkWin(move.col, move.row);
        const draw = this.gameCore.checkDraw();

        if (win || draw) {
            console.log(
                win
                    ? `Player ${this.gameCore.currentPlayer} won the game!`
                    : "Game ended in a draw"
            );
            this.gameCore.endGame(win ? this.gameCore.currentPlayer : 0);
        } else {
            const currentPlayer = this.gameCore.currentPlayer;
            this.gameCore.switchPlayer();
            console.log(
                `Turn switched from Player ${currentPlayer} to Player ${this.gameCore.currentPlayer}`
            );
        }

        if (this.gameMode === "multiplayer" && this.isHost) {
            setState("game", {
                board: this.gameCore.board,
                currentPlayer: this.gameCore.currentPlayer,
                gameEnded: this.gameCore.gameEnded,
                winPositions: this.gameCore.winPositions,
                lastMove: move,
            });
            this.gameCore.isAnimating = false;
            console.log("Host updated game state");
        }

        this.updateBoard();
        this.updateTurnText();

        if (this.gameCore.gameEnded) {
            this.handleGameOver(this.gameCore.currentPlayer);
        }
    }

    animateCoinDrop(col) {
        const dropResult = this.gameCore.dropCoin(col);
        if (!dropResult) return;

        const { col: colIndex, row } = dropResult;

        this.input.enabled = false;
        this.dropZones.forEach((zone) => zone.disableInteractive());

        const targetY = this.boardTopY + row * this.slotSize;

        this.tweens.add({
            targets: this.previewCoin,
            y: targetY,
            x: this.previewCoin.x,
            duration: 700,
            ease: "Bounce.easeOut",
            onComplete: () => {
                this.slots[colIndex][row].setFrame(this.gameCore.currentPlayer);
                this.previewCoin.setVisible(false);

                const win = this.gameCore.checkWin(colIndex, row);
                const draw = this.gameCore.checkDraw();

                if (win || draw) {
                    const winner = this.gameCore.endGame(
                        win ? this.gameCore.currentPlayer : 0
                    );
                    console.log(
                        win
                            ? `Animation complete: Player ${winner} won the game!`
                            : "Animation complete: Game ended in a draw"
                    );
                    this.handleGameOver(winner);
                } else {
                    const currentPlayer = this.gameCore.currentPlayer;
                    this.gameCore.switchPlayer();
                    console.log(
                        `Animation complete: Turn switched from Player ${currentPlayer} to Player ${this.gameCore.currentPlayer}`
                    );
                    this.updateTurnText();

                    if (!this.gameCore.gameEnded) {
                        this.dropZones.forEach((zone) => zone.setInteractive());
                        this.input.enabled = true;
                    }

                    this.gameCore.finishAnimation();
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

        if (this.gameMode === "multiplayer") {
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
        } else {
            let coinFrame = this.gameCore.currentPlayer - 1;

            this.previewCoin
                .setPosition(snapX, 120)
                .setFrame(coinFrame)
                .setVisible(true);
        }
    }

    // highlightColumn(col) {
    //     if (this.gameCore.gameEnded) return;

    //     const boardStartX =
    //         globals.centerX - (7 * this.slotSize) / 2 + this.slotSize / 2;
    //     const boardStartY =
    //         globals.centerY - (6 * this.slotSize) / 2 + this.slotSize / 2;
    //     const x = boardStartX + col * this.slotSize;

    //     this.columnHighlight.clear();
    //     this.columnHighlight.fillStyle(0xfff000, 0.55);
    //     this.columnHighlight.fillRoundedRect(
    //         x - this.slotSize / 2,
    //         boardStartY - this.slotSize / 2,
    //         this.slotSize,
    //         6 * this.slotSize,
    //         16
    //     );
    //     this.columnHighlight.setVisible(true);
    // }

    // unhighlightColumn() {
    //     this.columnHighlight.setVisible(false);
    // }

    updateTurnText() {
        this.turnText.setText(`Player ${this.gameCore.currentPlayer}'s Turn`);
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
                winner === 0 ? "Game Over: Draw!" : `Player ${winner} Wins!`
            )
            .setDepth(60)
            .setX(globals.centerX)
            .setY(globals.centerY - 450)
            .setStyle(globals.overlayTextStyle)
            .setVisible(false);

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
                    overlay.destroy();
                    this.restartText.destroy();
                    this.scene.restart();
                });
            },
        });
    }
}
