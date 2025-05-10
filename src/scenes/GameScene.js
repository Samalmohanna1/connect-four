import { Scene } from "phaser";
import globals from "../globals";

export class GameScene extends Scene {
    constructor() {
        super("GameScene");
    }

    create() {
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

        this.boardFrame = this.add
            .image(globals.centerX, globals.centerY + 57, "boardFrame")
            .setDepth(2);

        this.slotSize = 117;
        this.cols = 7;
        this.rows = 6;
        this.boardWidth = this.cols * this.slotSize;
        this.boardHeight = this.rows * this.slotSize;
        this.boardLeft = globals.centerX - this.boardWidth / 2;
        this.boardRight = this.boardLeft + this.boardWidth;
        this.boardTop = globals.centerY - this.boardHeight / 2;
        this.boardTopY = this.boardTopY =
            globals.centerY -
            (this.rows * this.slotSize) / 2 +
            this.slotSize / 2;

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
            zone.on("pointerover", () => this.highlightColumn(col));
            zone.on("pointerout", () => this.unhighlightColumn(col));
            zone.on("pointerdown", (pointer) => {
                this.showPreviewCoin(pointer);
                if (!this.isAnimating) {
                    this.dropCoin(col);
                }
            });
            this.dropZones.push(zone);
        }

        this.previewCoin = this.add
            .sprite(0, 0, "coin", 0)
            .setVisible(false)
            .setDepth(1);
        this.isAnimating = false; //coinDrop animation flag
        this.currentPlayer = 1; // 1 = red, 2 = black
        this.gameEnded = false;

        this.input.on("pointermove", (pointer) => {
            if (this.gameEnded) return;
            this.showPreviewCoin(pointer);
        });

        this.columnHighlight = this.add.graphics();
        this.columnHighlight.setVisible(false);

        this.turnText = this.add
            .text(
                200,
                80,
                `Player ${this.currentPlayer}'s Turn`,
                globals.bodyTextStyle
            )
            .setOrigin(0.5);

        this.winLine = this.add.graphics();
        this.winLine.setDepth(40);
    }

    showPreviewCoin(pointer) {
        const minX = this.boardLeft + 95 / 2;
        const maxX = this.boardRight - 95 / 2;
        const x = Phaser.Math.Clamp(pointer.x, minX, maxX);

        const col = Math.floor((x - this.boardLeft) / this.slotSize);
        const snapX = this.boardLeft + col * this.slotSize + this.slotSize / 2;

        this.previewCoin
            .setPosition(snapX, 120)
            .setFrame(this.currentPlayer - 1)
            .setVisible(true);
    }

    highlightColumn(col) {
        if (this.gameEnded) return;
        const boardStartX =
            globals.centerX - (7 * this.slotSize) / 2 + this.slotSize / 2;
        const boardStartY =
            globals.centerY - (6 * this.slotSize) / 2 + this.slotSize / 2;
        const x = boardStartX + col * this.slotSize;
        const y = boardStartY;
        this.columnHighlight.clear();
        this.columnHighlight.fillStyle(0xfff000, 0.55);
        const radius = 16;
        this.columnHighlight.fillRoundedRect(
            x - this.slotSize / 2,
            y - this.slotSize / 2,
            this.slotSize,
            6 * this.slotSize,
            radius
        );
        this.columnHighlight.setVisible(true);
    }

    unhighlightColumn(col) {
        this.columnHighlight.setVisible(false);
    }

    dropCoin(col) {
        if (this.gameEnded || this.isAnimating) return;

        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.slots[col][row].frame.name === 0) {
                this.input.enabled = false;
                this.isAnimating = true;
                this.dropZones.forEach((zone) => zone.disableInteractive());

                const targetY = this.boardTopY + row * this.slotSize;
                const currentRow = row;

                this.tweens.add({
                    targets: this.previewCoin,
                    y: targetY,
                    x: this.previewCoin.x,
                    duration: 700,
                    ease: "Bounce.easeOut",
                    onComplete: () => {
                        this.slots[col][currentRow].setFrame(
                            this.currentPlayer
                        );
                        this.previewCoin.setVisible(false);

                        if (this.checkWin(col, currentRow)) {
                            this.handleGameOver(this.currentPlayer);
                        } else if (this.checkDraw()) {
                            this.handleGameOver(0);
                        } else {
                            this.switchPlayer();
                            if (!this.gameEnded) {
                                this.dropZones.forEach((zone) =>
                                    zone.setInteractive()
                                );

                                this.input.enabled = true;
                            }
                            this.isAnimating = false;
                            const pointer = this.input.activePointer;
                            if (col !== null) {
                                this.showPreviewCoin(pointer);
                            }
                        }
                    },
                });
                break;
            }
        }
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.turnText.setText(`Player ${this.currentPlayer}'s Turn`);
        this.previewCoin.setFrame(this.currentPlayer - 1);
    }

    checkWin(col, row) {
        const player = this.currentPlayer;
        const directions = [
            [1, 0], // horizontal
            [0, 1], // vertical
            [1, 1], // diagonal /
            [1, -1], // diagonal \
        ];

        for (const [dx, dy] of directions) {
            let count = 1;
            let winPositions = [{ col, row }];
            for (let i = 1; i < 4; i++) {
                if (this.getSlot(col + i * dx, row + i * dy) === player) {
                    count++;
                    winPositions.push({ col: col + i * dx, row: row + i * dy });
                } else break;
            }
            for (let i = 1; i < 4; i++) {
                if (this.getSlot(col - i * dx, row - i * dy) === player) {
                    count++;
                    winPositions.unshift({
                        col: col - i * dx,
                        row: row - i * dy,
                    });
                } else break;
            }
            if (count >= 4) {
                this.winPositions = winPositions;
                return true;
            }
        }
        return false;
    }

    getSlot(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows)
            return null;
        return this.slots[col][row].frame.name;
    }

    checkDraw() {
        for (let col = 0; col < this.cols; col++) {
            if (this.slots[col][0].frame.name === 0) return false;
        }
        return true;
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
        this.gameEnded = true;
        this.previewCoin.setVisible(false);
        this.dropZones.forEach((zone) => zone.disableInteractive());
        this.columnHighlight.setVisible(false);
        this.input.enabled = true;
        this.coffee.stop();
        this.skyTween.stop();

        if (winner !== 0) {
            this.drawWinLine(this.winPositions);
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
