import { Boot } from "./scenes/Boot";
import { GameScene } from "./scenes/GameScene";
import { Game } from "phaser";
import { GameOver } from "./scenes/GameOver";
import { MainMenu } from "./scenes/MainMenu";
import { HowTo } from "./scenes/HowTo";
import { Preloader } from "./scenes/Preloader";
import global from "./globals";
import globals from "./globals";

const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: "game-container",
    backgroundColor: globals.colors.black600,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 400 },
        },
    },
    scene: [Boot, Preloader, MainMenu, HowTo, GameScene, GameOver],
};

global.centerX = config.width / 2;
global.centerY = config.height / 2;

export default new Game(config);
