import { ConnectFour } from "./ConnectFour";

// The computer opponent for single player. It runs entirely in the browser:
// it tries every column on copies of the board, looks a few moves ahead
// (minimax search with alpha-beta pruning) and scores the boards it reaches
// with the hand-written rules in scoreBoard.

const DEFAULT_DEPTH = 4;
const WIN_SCORE = 1000000;

// Picks a column for the player whose turn it is in `game`. Columns that
// score the same are chosen between at random, so games vary.
export function chooseComputerMove(
    game,
    { depth = DEFAULT_DEPTH, random = Math.random } = {}
) {
    const me = game.currentPlayer;
    let bestScore = -Infinity;
    let bestCols = [];

    for (const col of playableColumns(game)) {
        // A full search window per column, so equal scores are real ties.
        const score = minimax(
            playMove(game, col),
            depth - 1,
            -Infinity,
            Infinity,
            me
        );
        if (score > bestScore) {
            bestScore = score;
            bestCols = [col];
        } else if (score === bestScore) {
            bestCols.push(col);
        }
    }

    return bestCols[Math.floor(random() * bestCols.length)];
}

function minimax(game, depth, alpha, beta, me) {
    if (game.gameEnded) {
        if (game.winner === 0) return 0;
        // Adding the remaining depth prefers quicker wins and later losses.
        return game.winner === me ? WIN_SCORE + depth : -WIN_SCORE - depth;
    }
    if (depth === 0) return scoreBoard(game, me);

    const isMyTurn = game.currentPlayer === me;
    let best = isMyTurn ? -Infinity : Infinity;

    for (const col of playableColumns(game)) {
        const score = minimax(playMove(game, col), depth - 1, alpha, beta, me);
        if (isMyTurn) {
            best = Math.max(best, score);
            alpha = Math.max(alpha, best);
        } else {
            best = Math.min(best, score);
            beta = Math.min(beta, best);
        }
        // The other player would never allow this line, so stop exploring it.
        if (alpha >= beta) break;
    }

    return best;
}

// Center columns first: they tend to be best, which lets pruning skip more.
function playableColumns(game) {
    const center = (game.cols - 1) / 2;
    return [...Array(game.cols).keys()]
        .filter((col) => game.board[col][0] === 0)
        .sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
}

function playMove(game, col) {
    const next = new ConnectFour(game.cols, game.rows);
    next.setState(game.getState());
    next.dropCoin(col);
    return next;
}

// Scores a board that isn't won yet, from `me`'s point of view. Every line
// of four slots is checked: lines that are filling up with one player's coins
// and still open count for that player. Center coins get a bonus because
// more lines pass through the center.
function scoreBoard(game, me) {
    const { board, cols, rows } = game;
    const center = Math.floor(cols / 2);
    let score = 0;

    for (let row = 0; row < rows; row++) {
        const cell = board[center][row];
        if (cell === me) score += 3;
        else if (cell !== 0) score -= 3;
    }

    const directions = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
    ];
    for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
            for (const [dx, dy] of directions) {
                const endCol = col + 3 * dx;
                const endRow = row + 3 * dy;
                if (endCol >= cols || endRow < 0 || endRow >= rows) continue;

                let mine = 0;
                let theirs = 0;
                for (let i = 0; i < 4; i++) {
                    const cell = board[col + i * dx][row + i * dy];
                    if (cell === me) mine++;
                    else if (cell !== 0) theirs++;
                }
                score += scoreLine(mine, theirs);
            }
        }
    }

    return score;
}

function scoreLine(mine, theirs) {
    if (mine > 0 && theirs > 0) return 0; // blocked, nobody can win here
    if (mine === 3) return 5;
    if (mine === 2) return 2;
    if (theirs === 3) return -5;
    if (theirs === 2) return -2;
    return 0;
}
