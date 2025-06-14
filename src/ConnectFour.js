export class ConnectFour {
    constructor(cols = 7, rows = 6) {
        this.cols = cols;
        this.rows = rows;
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1;
        this.gameEnded = false;
        this.winPositions = [];
        this.isAnimating = false;
    }

    getState() {
        return {
            board: this.board.map((col) => [...col]),
            currentPlayer: this.currentPlayer,
            gameEnded: this.gameEnded,
            winPositions: [...this.winPositions],
            isAnimating: this.isAnimating,
        };
    }

    setState(state) {
        if (!state) return;

        this.board = state.board.map((col) => [...col]);
        this.currentPlayer = state.currentPlayer;
        this.gameEnded = state.gameEnded;
        this.winPositions = state.winPositions ? [...state.winPositions] : [];
        this.isAnimating = state.isAnimating || false;
    }

    createEmptyBoard() {
        const board = [];
        for (let col = 0; col < this.cols; col++) {
            board[col] = [];
            for (let row = 0; row < this.rows; row++) {
                board[col][row] = 0;
            }
        }
        return board;
    }

    dropCoin(col) {
        if (this.gameEnded) {
            console.log("ConnectFour: Move rejected - game has ended");
            return null;
        }

        if (this.isAnimating) {
            console.log("ConnectFour: Move rejected - animation in progress");
            return null;
        }

        if (col < 0 || col >= this.cols) {
            console.error(
                `ConnectFour: Invalid column ${col} - out of bounds [0-${
                    this.cols - 1
                }]`
            );
            return null;
        }

        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[col][row] === 0) {
                this.isAnimating = true;

                this.board[col][row] = this.currentPlayer;
                // console.log(
                //     `ConnectFour: Placed Player ${this.currentPlayer}'s coin at column ${col}, row ${row}`
                // );

                const move = { col, row, player: this.currentPlayer };

                if (this.checkWin(col, row)) {
                    // console.log(
                    //     `ConnectFour: Player ${this.currentPlayer} wins!`
                    // );
                    this.endGame(this.currentPlayer);
                    return move;
                }

                if (this.checkDraw()) {
                    // console.log("ConnectFour: Game is a draw!");
                    this.endGame(0);
                    return move;
                }
                if (!this.gameEnded) {
                    this.switchPlayer();
                }

                return move;
            }
        }

        // console.log(`ConnectFour: Column ${col} is full, move rejected`);
        return null;
    }

    finishAnimation() {
        this.isAnimating = false;
    }

    getSlotValue(col, row) {
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return null;
        }
        return this.board[col][row];
    }

    switchPlayer() {
        const oldPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
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
            let positions = [{ col, row }];

            for (let i = 1; i < 4; i++) {
                const checkCol = col + i * dx;
                const checkRow = row + i * dy;
                const value = this.getSlotValue(checkCol, checkRow);

                if (value === player) {
                    count++;
                    positions.push({ col: checkCol, row: checkRow });
                } else break;
            }

            for (let i = 1; i < 4; i++) {
                const checkCol = col - i * dx;
                const checkRow = row - i * dy;
                const value = this.getSlotValue(checkCol, checkRow);

                if (value === player) {
                    count++;
                    positions.unshift({ col: checkCol, row: checkRow });
                } else break;
            }

            if (count >= 4) {
                this.winPositions = positions;
                return true;
            }
        }
        return false;
    }

    checkDraw() {
        for (let col = 0; col < this.cols; col++) {
            if (this.board[col][0] === 0) {
                return false;
            }
        }
        return true;
    }

    endGame(winner) {
        this.gameEnded = true;
        return winner;
    }

    reset() {
        this.board = this.createEmptyBoard();
        this.currentPlayer = 1;
        this.gameEnded = false;
        this.winPositions = [];
        this.isAnimating = false;
    }
}
