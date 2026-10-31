import { describe, it, expect } from "vitest";
import { ConnectFour } from "./ConnectFour";
import { chooseComputerMove } from "./ComputerPlayer";

function gameAfter(cols) {
    const game = new ConnectFour();
    for (const col of cols) {
        if (!game.dropCoin(col)) {
            throw new Error(`Move in column ${col} was rejected`);
        }
    }
    return game;
}

// Repeatable stand-in for Math.random.
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

describe("chooseComputerMove", () => {
    it("takes a winning move", () => {
        // Player 2 has three in the bottom row and can finish in column 3.
        const game = gameAfter([6, 0, 6, 1, 5, 2, 5]);
        expect(chooseComputerMove(game)).toBe(3);
    });

    it("blocks the other player's winning move", () => {
        // Player 1 has three in the bottom row and threatens column 3.
        const game = gameAfter([0, 6, 1, 6, 2]);
        expect(chooseComputerMove(game)).toBe(3);
    });

    it("wins instead of blocking when it can do either", () => {
        // Player 2 can win in column 6; player 1 threatens column 3.
        const game = gameAfter([0, 6, 1, 6, 5, 6, 2]);
        expect(chooseComputerMove(game)).toBe(6);
    });

    it("does not play under the other player's winning slot", () => {
        // Player 1 needs row 4 of column 3. Playing column 3 now would fill
        // the slot below it and let player 1 win next turn.
        const game = gameAfter([1, 0, 0, 2, 2, 4, 1]);
        expect(chooseComputerMove(game)).not.toBe(3);
    });

    it("only picks columns that have space", () => {
        // Columns 0-5 are full with no winner; only column 6 is open.
        const game = gameAfter([
            0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 4, 5, 4, 5, 4, 5, 1, 0, 1, 0, 1,
            0, 3, 2, 3, 2, 3, 2, 5, 4, 5, 4, 5, 4,
        ]);
        expect(chooseComputerMove(game)).toBe(6);
    });

    it("opens in the center column", () => {
        expect(chooseComputerMove(new ConnectFour(), { random: () => 0 })).toBe(
            3
        );
    });

    it("plays legal moves and beats a random player", () => {
        let computerWins = 0;

        for (let seed = 1; seed <= 10; seed++) {
            const random = seededRandom(seed);
            const game = new ConnectFour();

            while (!game.gameEnded) {
                const col =
                    game.currentPlayer === 2
                        ? chooseComputerMove(game, { random })
                        : Math.floor(random() * game.cols);
                if (game.board[col][0] !== 0) {
                    expect(game.currentPlayer).toBe(1); // only the random player may pick a full column
                    continue;
                }
                expect(game.dropCoin(col)).not.toBeNull();
            }

            if (game.winner === 2) computerWins++;
        }

        expect(computerWins).toBeGreaterThanOrEqual(9);
    });
});
