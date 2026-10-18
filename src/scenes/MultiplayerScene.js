import { BoardScene } from "./BoardScene";
import { isHost, setState, getState, onPlayerJoin, RPC } from "playroomkit";

// Only the host writes the shared "game" state. The guest sends its moves and
// rematch requests to the host over RPC, and both clients animate a move when
// they see moveCount go up.
export class MultiplayerScene extends BoardScene {
    constructor() {
        super("MultiplayerScene");
    }

    init(data) {
        this.isHost = isHost();
        this.myPlayerNumber = this.isHost ? 1 : 2;
        this.hostName = data.hostName;
        this.guestName = data.guestName;
    }

    create() {
        super.create();
        this.round = null;
        this.hasLeft = false;

        if (this.isHost) {
            // Each new game is a new round, so the guest knows to restart too.
            this.round = (getState("game")?.round ?? 0) + 1;
            this.publishState();
        }

        this.setupNetworking();

        this.time.addEvent({
            delay: 100,
            callback: this.syncFromState,
            callbackScope: this,
            loop: true,
        });
    }

    update() {
        if (getState("leftGame")) {
            this.leaveGame();
        }
    }

    playerName(player) {
        return player === 1 ? this.hostName : this.guestName;
    }

    canMove() {
        return (
            super.canMove() &&
            this.gameCore.currentPlayer === this.myPlayerNumber
        );
    }

    onColumnClick(col) {
        if (this.isHost) {
            this.applyMove(col, this.myPlayerNumber);
        } else {
            RPC.call("move", col, RPC.Mode.HOST);
        }
    }

    onBack() {
        setState("leftGame", true, true);
        this.leaveGame();
    }

    onPlayAgain() {
        if (this.isHost) {
            this.startRematch();
        } else {
            RPC.call("rematch", null, RPC.Mode.HOST);
        }
    }

    leaveGame() {
        if (this.hasLeft) return;
        this.hasLeft = true;
        this.scene.start("PlayerDisconnect");
    }

    setupNetworking() {
        const cleanups = [];

        // onPlayerJoin also fires for players already in the room, so the quit
        // listeners are attached again after every rematch restart.
        cleanups.push(
            onPlayerJoin((player) => {
                cleanups.push(player.onQuit(() => this.leaveGame()));
            })
        );

        if (this.isHost) {
            cleanups.push(
                RPC.register("move", async (col) => {
                    this.applyMove(col, 2);
                }),
                RPC.register("rematch", async () => {
                    this.startRematch();
                })
            );
        }

        this.events.once("shutdown", () => {
            cleanups.forEach((cleanup) => cleanup());
        });
    }

    publishState() {
        setState("game", { ...this.gameCore.getState(), round: this.round });
    }

    syncFromState() {
        const state = getState("game");
        if (!state) return;

        if (!this.isHost) {
            if (this.round === null) this.round = state.round;

            // The host started a rematch.
            if (state.round !== this.round) {
                this.scene.restart();
                return;
            }
        }

        if (this.isDropping || this.isGameOver) return;

        this.gameCore.setState(state);

        if (state.moveCount > this.shownMoveCount) {
            this.shownMoveCount = state.moveCount;
            const { col, row } = state.lastMove;

            // Show every coin except the one about to fall into place.
            this.updateBoard();
            this.slots[col][row].setFrame(0);
            this.animateCoinDrop(state.lastMove);
        } else {
            this.updateBoard();
            this.updateTurnText();
        }
    }

    // Host only.
    applyMove(col, player) {
        if (player !== this.gameCore.currentPlayer) return;
        if (!this.gameCore.dropCoin(col)) return;
        this.publishState();
    }

    // Host only. Restarting publishes a new round, which restarts the guest.
    startRematch() {
        if (!this.gameCore.gameEnded) return;
        this.scene.restart();
    }
}
