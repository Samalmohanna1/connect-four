import { BoardScene } from "./BoardScene";

// Two players taking turns on one device.
export class GameScene extends BoardScene {
    constructor() {
        super("GameScene");
    }

    onColumnClick(col) {
        const move = this.gameCore.dropCoin(col);
        if (!move) return;

        this.shownMoveCount = this.gameCore.moveCount;
        this.animateCoinDrop(move);
    }

    onBack() {
        this.time.delayedCall(10, () => {
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("MainMenu");
            });
        });
    }

    onPlayAgain() {
        this.scene.restart();
    }
}
