import { Scene } from "phaser";
import globals from "../globals";

export class GameScene extends Scene {
    constructor() {
        super("GameScene");
    }

    create() {
        this.add.image(globals.centerX, globals.centerY, "gameBg");

        this.boardFrame = this.add.image(
            globals.centerX,
            globals.centerY + 57,
            "boardFrame"
        );

        const slotSize = 117;
        this.cols = 7;
        this.rows = 6;
        this.boardWidth = this.cols * slotSize;
        this.boardHeight = this.rows * slotSize;
        this.boardLeft = globals.centerX - this.boardWidth / 2;
        this.boardRight = this.boardLeft + this.boardWidth;
        this.boardTop = globals.centerY - this.boardHeight / 2;

        // Slot grid
        this.slots = [];
        for (let col = 0; col < this.cols; col++) {
            this.slots[col] = [];
            for (let row = 0; row < this.rows; row++) {
                const x = this.boardLeft + col * slotSize + slotSize / 2;
                const y = this.boardTop + row * slotSize + slotSize / 2;
                this.slots[col][row] = this.add.sprite(x, y, "slot", 0);
            }
        }

        // Full-height drop zones
        this.dropZones = [];
        for (let col = 0; col < this.cols; col++) {
            const zone = this.add
                .rectangle(
                    this.boardLeft + col * slotSize + slotSize / 2,
                    globals.centerY,
                    slotSize,
                    this.boardHeight,
                    0xffffff,
                    0
                )
                .setInteractive({ useHandCursor: true });
            zone.column = col;
            zone.on("pointerover", () => this.highlightColumn(col));
            zone.on("pointerout", () => this.unhighlightColumn(col));
            zone.on("pointerdown", () => this.dropCoin(col));
            this.dropZones.push(zone);
        }

        // Floating preview coin
        this.previewCoin = this.add
            .sprite(0, 0, "coin", 0)
            .setVisible(false)
            .setDepth(10);

        // Player turn initialization
        this.currentPlayer = 1; // 1 = red, 2 = black
        this.gameEnded = false;

        // Input handling for preview coin
        this.input.on("pointermove", (pointer) => {
            if (this.gameEnded) return;

            // Constrain X position to board bounds
            const minX = this.boardLeft + 95 / 2;
            const maxX = this.boardRight - 95 / 2;
            const x = Phaser.Math.Clamp(pointer.x, minX, maxX);

            // Snap to column center
            const col = Math.floor((x - this.boardLeft) / slotSize);
            const snapX = this.boardLeft + col * slotSize + slotSize / 2;

            this.previewCoin
                .setPosition(snapX, 120)
                .setFrame(this.currentPlayer - 1)
                .setVisible(true);
        });

        // Highlight overlay (for column hover)
        this.columnHighlight = this.add.graphics();
        this.columnHighlight.setVisible(false);

        // Turn text
        this.turnText = this.add
            .text(
                200,
                50,
                `Player ${this.currentPlayer}'s Turn`,
                globals.bodyTextStyle
            )
            .setOrigin(0.5);
    }

    highlightColumn(col) {
        if (this.gameEnded) return;
        const slotSize = 117;
        const boardStartX = globals.centerX - (7 * slotSize) / 2 + slotSize / 2;
        const boardStartY = globals.centerY - (6 * slotSize) / 2 + slotSize / 2;
        const x = boardStartX + col * slotSize;
        const y = boardStartY;
        this.columnHighlight.clear();
        this.columnHighlight.fillStyle(0xfff000, 0.3);
        this.columnHighlight.fillRect(
            x - slotSize / 2,
            y - slotSize / 2,
            slotSize,
            6 * slotSize
        );
        this.columnHighlight.setVisible(true);
    }

    unhighlightColumn(col) {
        this.columnHighlight.setVisible(false);
    }

    dropCoin(col) {
        if (this.gameEnded) return;
        // Find lowest empty row (from bottom up)
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.slots[col][row].frame.name === 0) {
                this.slots[col][row].setFrame(this.currentPlayer);
                if (this.checkWin(col, row)) {
                    this.handleGameOver(this.currentPlayer);
                } else if (this.checkDraw()) {
                    this.handleGameOver(0); // 0 = draw
                } else {
                    this.switchPlayer();
                }
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
            for (let i = 1; i < 4; i++) {
                if (this.getSlot(col + i * dx, row + i * dy) === player)
                    count++;
                else break;
            }
            for (let i = 1; i < 4; i++) {
                if (this.getSlot(col - i * dx, row - i * dy) === player)
                    count++;
                else break;
            }
            if (count >= 4) return true;
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
    handleGameOver(winner) {
        this.gameEnded = true;
        this.previewCoin.setVisible(false);
        if (winner === 0) {
            this.turnText.setText("Game Over: Draw!");
        } else {
            this.turnText.setText(`Player ${winner} Wins!`);
            this.time.delayedCall(1000, () => {
                this.scene.start("GameOver", { winner: this.currentPlayer });
            });
        }
    }
}
