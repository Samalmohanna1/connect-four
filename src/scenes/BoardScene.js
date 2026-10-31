import { Scene, Math as PhaserMath } from "phaser";
import globals from "../globals";
import { ConnectFour } from "../ConnectFour";

const COLS = 7;
const ROWS = 6;
const SLOT_SIZE = 117;
const COIN_SIZE = 95;
const PREVIEW_Y = 120;

// The board, background, HUD and game-over screen shared by the local and
// multiplayer scenes. Subclasses decide who may move, how a move is made,
// how players are named, and what the back and play-again actions do.
export class BoardScene extends Scene {
    create() {
        // Scene instances are reused on restart, so per-game state is reset here.
        this.gameCore = new ConnectFour(COLS, ROWS);
        this.isDropping = false;
        this.isGameOver = false;
        this.canPlayAgain = false;
        // How many moves the board has finished showing.
        this.shownMoveCount = 0;
        // The column the preview coin points at, set by the pointer or keyboard.
        this.selectedCol = Math.floor(COLS / 2);
        // Only true once the pointer is used, so a player who hasn't touched
        // anything yet keeps the center column rather than wherever the
        // pointer happens to be.
        this.followsPointer = false;

        this.setupBackground();
        this.setupGameBoard();
        this.setupInteraction();
        this.setupKeyboard();
        this.setupUI();
        this.updateTurnText();
        this.onTurnStart();
    }

    playerName(player) {
        return `Player ${player}`;
    }

    turnLabel(player) {
        return `${this.playerName(player)}'s Turn`;
    }

    winLabel(player) {
        return `${this.playerName(player)} Wins!`;
    }

    canMove() {
        return !this.gameCore.gameEnded && !this.isDropping;
    }

    // Called with a column when canMove() is true.
    onColumnClick(col) {}

    // Called when a turn begins: at the start of the game and after each
    // coin lands, unless that coin ended the game.
    onTurnStart() {}

    onBack() {}

    onPlayAgain() {}

    columnX(col) {
        return this.boardLeft + col * SLOT_SIZE + SLOT_SIZE / 2;
    }

    rowY(row) {
        return this.boardTop + row * SLOT_SIZE + SLOT_SIZE / 2;
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
        this.boardLeft = globals.centerX - (COLS * SLOT_SIZE) / 2;
        this.boardTop = globals.centerY - (ROWS * SLOT_SIZE) / 2;

        this.add
            .image(globals.centerX, globals.centerY + 57, "boardFrame")
            .setDepth(2);

        this.slots = [];
        for (let col = 0; col < COLS; col++) {
            this.slots[col] = [];
            for (let row = 0; row < ROWS; row++) {
                this.slots[col][row] = this.add
                    .sprite(this.columnX(col), this.rowY(row), "slot", 0)
                    .setDepth(2);
            }
        }

        this.winLine = this.add.graphics().setDepth(40);
    }

    setupInteraction() {
        this.dropZones = [];
        for (let col = 0; col < COLS; col++) {
            const zone = this.add
                .rectangle(
                    this.columnX(col),
                    globals.centerY,
                    SLOT_SIZE,
                    ROWS * SLOT_SIZE,
                    0xffffff,
                    0
                )
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", (pointer) => {
                    this.followPointer(pointer);
                    if (this.canMove()) {
                        this.onColumnClick(col);
                    }
                });
            this.dropZones.push(zone);
        }

        this.previewCoin = this.add
            .sprite(0, 0, "coin", 0)
            .setVisible(false)
            .setDepth(1);

        this.input.on("pointermove", (pointer) => {
            this.followPointer(pointer);
        });
    }

    // Left and right choose a column; Enter or Space drops a coin there, or
    // starts the next game once the game-over screen is up.
    setupKeyboard() {
        const keyboard = this.input.keyboard;

        keyboard.on("keydown-LEFT", () => this.moveSelection(-1));
        keyboard.on("keydown-RIGHT", () => this.moveSelection(1));

        for (const key of ["ENTER", "SPACE"]) {
            keyboard.on(`keydown-${key}`, (event) => {
                // Holding the key down shouldn't drop a coin into the next game.
                if (event.repeat) return;

                if (this.canPlayAgain) {
                    this.onPlayAgain();
                } else if (this.canMove()) {
                    this.followsPointer = false;
                    this.onColumnClick(this.selectedCol);
                }
            });
        }
    }

    moveSelection(step) {
        if (!this.canMove()) return;

        this.followsPointer = false;
        this.selectedCol = PhaserMath.Clamp(
            this.selectedCol + step,
            0,
            COLS - 1
        );
        this.showPreviewCoin();
    }

    setupUI() {
        this.turnText = this.add.text(0, 0, "", globals.turnTextStyle);

        this.add
            .image(1700, 1020, "backBtn")
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .setScale(0.6)
            .on("pointerdown", () => this.onBack());

        if (!this.sys.game.device.os.desktop) {
            this.add
                .image(1700, 930, "fsBtn")
                .setInteractive({ useHandCursor: true })
                .setOrigin(0.5)
                .setScale(0.6)
                .setDepth(60)
                .on("pointerdown", () => this.scale.toggleFullscreen());
        }
    }

    // Selects the column under the pointer.
    followPointer(pointer) {
        const boardRight = this.boardLeft + COLS * SLOT_SIZE;
        const x = PhaserMath.Clamp(
            pointer.x,
            this.boardLeft + COIN_SIZE / 2,
            boardRight - COIN_SIZE / 2
        );

        this.followsPointer = true;
        this.selectedCol = Math.floor((x - this.boardLeft) / SLOT_SIZE);
        this.showPreviewCoin();
    }

    showPreviewCoin() {
        if (!this.canMove()) {
            this.previewCoin.setVisible(false);
            return;
        }

        this.previewCoin
            .setPosition(this.columnX(this.selectedCol), PREVIEW_Y)
            .setFrame(this.gameCore.currentPlayer - 1)
            .setVisible(true);
    }

    // Drops a coin into place, then either ends the game or hands over the turn.
    animateCoinDrop({ col, row, player }) {
        const coin = this.add
            .sprite(this.columnX(col), PREVIEW_Y, "coin", player - 1)
            .setDepth(1);

        this.isDropping = true;
        this.previewCoin.setVisible(false);
        this.input.enabled = false;
        this.dropZones.forEach((zone) => zone.disableInteractive());

        this.sound.play("coinDrop", {
            volume: 0.7,
            rate: 1.1,
        });
        this.tweens.add({
            targets: coin,
            y: this.rowY(row),
            duration: 700,
            ease: "Bounce.easeOut",
            onComplete: () => {
                this.slots[col][row].setFrame(player);
                coin.destroy();
                this.isDropping = false;

                // In multiplayer the host's game may already hold a newer move
                // that arrived mid-drop; that move is animated next.
                const isFinalMove =
                    this.gameCore.gameEnded &&
                    this.gameCore.moveCount === this.shownMoveCount;

                if (isFinalMove) {
                    this.handleGameOver(this.gameCore.winner);
                } else {
                    this.updateTurnText();
                    this.dropZones.forEach((zone) => zone.setInteractive());
                    this.input.enabled = true;
                    // The preview catches up with wherever the pointer went,
                    // or stays on the keyboard player's column.
                    if (this.followsPointer) {
                        this.followPointer(this.input.activePointer);
                    } else {
                        this.showPreviewCoin();
                    }
                    this.onTurnStart();
                }
            },
        });
    }

    updateTurnText() {
        const player = this.gameCore.currentPlayer;
        const bgColor =
            player === 1 ? globals.colors.red600 : globals.colors.black500;

        this.turnText
            .setText(this.turnLabel(player))
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
        const first = positions[0];
        const last = positions[positions.length - 1];

        this.winLine
            .clear()
            .lineStyle(16, 0xf5f3ef, 1.0)
            .beginPath()
            .moveTo(this.columnX(first.col), this.rowY(first.row))
            .lineTo(this.columnX(last.col), this.rowY(last.row))
            .strokePath()
            .setVisible(true);
    }

    handleGameOver(winner) {
        this.isGameOver = true;
        this.previewCoin.setVisible(false);
        this.dropZones.forEach((zone) => zone.disableInteractive());
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
                winner === 0 ? "Game Over: Draw!" : this.winLabel(winner)
            )
            .setDepth(60)
            .setX(globals.centerX)
            .setY(globals.centerY - 450)
            .setStyle(globals.overlayTextStyle)
            .setVisible(false)
            .setOrigin(0.5);

        const restartText = this.add
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
                restartText.setVisible(true);
                this.canPlayAgain = true;
                overlay.on("pointerdown", () => this.onPlayAgain());
            },
        });
    }
}
