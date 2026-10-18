import { BoardScene } from "./BoardScene";
import { fadeToScene } from "../fadeToScene";

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
        fadeToScene(this, "MainMenu");
    }

    onPlayAgain() {
        this.scene.restart();
    }
}
