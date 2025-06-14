import { Scene } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";

export class GameScene extends Scene {
    constructor() {
        super("GameScene");
        this.lastAnimatedMove = null;
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
    }

    setupGameCore() {
        this.gameCore = new ConnectFour(this.cols, this.rows);
    }

    loadState(state) {
        if (!state) return;

        this.gameCore.board = state.board.map((col) => [...col]);
        this.gameCore.currentPlayer = state.currentPlayer;
        this.gameCore.gameEnded = state.gameEnded;
        this.gameCore.winPositions = state.winPositions || [];
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
            `Player ${this.gameCore?.currentPlayer || 1}'s Turn`,
            {
                ...globals.turnTextStyle,
                backgroundColor: bgColor,
            }
        );
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
        this.animateCoinDrop(col);
    }

    processPlayerMove(col) {
        const move = this.gameCore.dropCoin(col);
        if (!move) {
            console.log(`Invalid move in column ${col}`);
            return;
        }

        const win = this.gameCore.checkWin(move.col, move.row);
        const draw = this.gameCore.checkDraw();

        if (win || draw) {
            this.gameCore.endGame(win ? this.gameCore.currentPlayer : 0);
        } else {
            const currentPlayer = this.gameCore.currentPlayer;
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

        const { col: colIndex, row, player } = dropResult;

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
                this.slots[colIndex][row].setFrame(player - 1);
                this.previewCoin.setVisible(false);

                this.updateBoard();
                this.updateTurnText();

                if (this.gameCore.gameEnded) {
                    this.handleGameOver(player);
                } else {
                    this.dropZones.forEach((zone) => zone.setInteractive());
                    this.input.enabled = true;
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

        let coinFrame = this.gameCore.currentPlayer - 1;

        this.previewCoin
            .setPosition(snapX, 120)
            .setFrame(coinFrame)
            .setVisible(true);
    }

    updateTurnText() {
        const bgColor =
            this.gameCore?.currentPlayer === 1
                ? globals.colors.red600
                : globals.colors.black500;

        this.turnText
            .setText(`Player ${this.gameCore.currentPlayer}'s Turn`)
            .setStyle({ backgroundColor: bgColor });
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
            .setVisible(false)
            .setOrigin(0.5);

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
                    overlay.destroy();
                    this.restartText.destroy();
                    this.scene.restart();
                });
            },
        });
    }
}
