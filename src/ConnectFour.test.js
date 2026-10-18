import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConnectFour } from "./ConnectFour";

// Drops coins in the given columns, finishing each animation like the scenes do.
function play(game, cols) {
    let move = null;
    for (const col of cols) {
        move = game.dropCoin(col);
        if (!move) throw new Error(`Move in column ${col} was rejected`);
        game.finishAnimation();
    }
    return move;
}

// Fills all 42 slots without anyone getting four in a row.
const DRAW_SEQUENCE = [
    0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 4, 5, 4, 5, 4, 5, 1, 0, 1, 0, 1, 0, 3,
    2, 3, 2, 3, 2, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6,
];

describe("ConnectFour", () => {
    let game;

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        game = new ConnectFour();
    });

    describe("dropCoin", () => {
        it("lands in the lowest empty row and alternates players", () => {
            expect(play(game, [3])).toEqual({ col: 3, row: 5, player: 1 });
            expect(play(game, [3])).toEqual({ col: 3, row: 4, player: 2 });
            expect(game.currentPlayer).toBe(1);
        });

        it("rejects a move while the previous coin is animating", () => {
            game.dropCoin(0);
            expect(game.dropCoin(1)).toBeNull();
            game.finishAnimation();
            expect(game.dropCoin(1)).not.toBeNull();
        });

        it("rejects a full column without switching players", () => {
            play(game, [0, 0, 0, 0, 0, 0]);
            expect(game.dropCoin(0)).toBeNull();
            expect(game.currentPlayer).toBe(1);
        });

        it("rejects out-of-bounds columns", () => {
            expect(game.dropCoin(-1)).toBeNull();
            expect(game.dropCoin(7)).toBeNull();
        });

        it("rejects moves after the game has ended", () => {
            play(game, [0, 1, 0, 1, 0, 1, 0]);
            expect(game.dropCoin(2)).toBeNull();
        });
    });

    describe("wins", () => {
        it("detects a horizontal win", () => {
            play(game, [0, 0, 1, 1, 2, 2, 3]);
            expect(game.gameEnded).toBe(true);
            expect(game.winner).toBe(1);
            expect(game.winPositions).toEqual([
                { col: 0, row: 5 },
                { col: 1, row: 5 },
                { col: 2, row: 5 },
                { col: 3, row: 5 },
            ]);
        });

        it("detects a vertical win", () => {
            play(game, [6, 0, 1, 0, 1, 0, 1, 0]);
            expect(game.winner).toBe(2);
            expect(game.winPositions).toEqual([
                { col: 0, row: 2 },
                { col: 0, row: 3 },
                { col: 0, row: 4 },
                { col: 0, row: 5 },
            ]);
        });

        it("detects a diagonal win rising to the right", () => {
            play(game, [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
            expect(game.winner).toBe(1);
            expect(game.winPositions).toEqual([
                { col: 0, row: 5 },
                { col: 1, row: 4 },
                { col: 2, row: 3 },
                { col: 3, row: 2 },
            ]);
        });

        it("detects a diagonal win falling to the right", () => {
            play(game, [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
            expect(game.winner).toBe(1);
            expect(game.winPositions).toEqual([
                { col: 3, row: 2 },
                { col: 4, row: 3 },
                { col: 5, row: 4 },
                { col: 6, row: 5 },
            ]);
        });

        it("detects a win when the last coin fills a gap in the line", () => {
            play(game, [0, 0, 1, 1, 3, 3, 2]);
            expect(game.winner).toBe(1);
            // The win line is drawn from the first to the last position.
            expect(game.winPositions[0]).toEqual({ col: 0, row: 5 });
            expect(game.winPositions.at(-1)).toEqual({ col: 3, row: 5 });
        });

        it("does not switch players after a win", () => {
            play(game, [0, 0, 1, 1, 2, 2, 3]);
            expect(game.currentPlayer).toBe(1);
        });
    });

    describe("draws", () => {
        it("ends in a draw when the board fills with no winner", () => {
            const lastMove = play(game, DRAW_SEQUENCE);
            expect(game.gameEnded).toBe(true);
            expect(game.winner).toBe(0);
            expect(game.winPositions).toEqual([]);
            // The last mover is not the winner.
            expect(lastMove.player).toBe(2);
        });

        it("does not end the game while the top row has space", () => {
            play(game, DRAW_SEQUENCE.slice(0, -1));
            expect(game.gameEnded).toBe(false);
            expect(game.winner).toBeNull();
        });
    });

    describe("state", () => {
        it("round-trips through getState and setState", () => {
            play(game, [0, 0, 1, 1, 2, 2, 3]);
            const copy = new ConnectFour();
            copy.setState(game.getState());
            expect(copy.getState()).toEqual(game.getState());
        });

        it("keeps a draw (winner 0) when restoring state", () => {
            play(game, DRAW_SEQUENCE);
            const copy = new ConnectFour();
            copy.setState(game.getState());
            expect(copy.winner).toBe(0);
        });

        it("returns copies, so changing the state does not change the game", () => {
            const state = game.getState();
            state.board[0][5] = 2;
            expect(game.board[0][5]).toBe(0);
        });

        it("reset clears the board and the result", () => {
            play(game, [0, 0, 1, 1, 2, 2, 3]);
            game.reset();
            expect(game.getState()).toEqual(new ConnectFour().getState());
        });
    });
});
