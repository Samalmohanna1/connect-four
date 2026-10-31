import globals from "./globals";
import { Game, AUTO, Scale } from "phaser";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { MainMenu } from "./scenes/MainMenu";
import { HowTo } from "./scenes/HowTo";
import { GameScene } from "./scenes/GameScene";
import { PlayerDisconnect } from "./scenes/PlayerDisconnect";

const config = {
    type: AUTO,
    width: 1920,
    height: 1080,
    parent: "game-container",
    backgroundColor: globals.colors.black600,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        HowTo,
        GameScene,
        // MultiplayerScene is added by MainMenu when multiplayer starts.
        PlayerDisconnect,
    ],
};

globals.centerX = config.width / 2;
globals.centerY = config.height / 2;

export default new Game(config);
