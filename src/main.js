import globals from "./globals";
import { Game } from "phaser";
import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { MainMenu } from "./scenes/MainMenu";
import { HowTo } from "./scenes/HowTo";
import { GameScene } from "./scenes/GameScene";

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
    scene: [Boot, Preloader, MainMenu, HowTo, GameScene],
};

globals.centerX = config.width / 2;
globals.centerY = config.height / 2;

export default new Game(config);
