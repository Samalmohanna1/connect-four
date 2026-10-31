import { BoardScene } from "./BoardScene";
import { fadeToScene } from "../fadeToScene";
import { chooseComputerMove } from "../ComputerPlayer";

const HUMAN = 1;
const COMPUTER = 2;

// Single player: you play red and go first, the computer plays black.
export class GameScene extends BoardScene {
    constructor() {
        super("GameScene");
    }

    turnLabel(player) {
        return player === HUMAN ? "Your Turn" : "Computer's Turn";
    }

    winLabel(player) {
        return player === HUMAN ? "You Win!" : "Computer Wins!";
    }

    canMove() {
        return super.canMove() && this.gameCore.currentPlayer === HUMAN;
    }

    onColumnClick(col) {
        this.playMove(col);
    }

    onTurnStart() {
        if (this.gameCore.currentPlayer !== COMPUTER) return;

        // A short pause so the computer's reply doesn't feel instant.
        this.time.delayedCall(500, () => {
            this.playMove(chooseComputerMove(this.gameCore));
        });
    }

    playMove(col) {
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
