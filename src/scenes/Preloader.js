import { Scene } from "phaser";
import globals from "../globals";
import { fadeToScene } from "../fadeToScene";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    init() {
        const logo = this.add.image(
            globals.centerX,
            globals.centerY - 100,
            "studioLogo"
        );
        logo.setOrigin(0.5);

        this.tweens.add({
            targets: logo,
            y: "+=10",
            duration: 700,
            yoyo: true,
            repeat: -1,
        });
    }

    preload() {
        // A Latin subset of the Open Sans variable font, covering weights 300-800.
        this.load.font("OpenSans", "fonts/OpenSans.woff2", "woff2", {
            weight: "300 800",
        });
        this.load.setPath("assets");

        this.load.image("title", "title.webp");
        this.load.image("howTo", "howTo.webp");
        this.load.image("gameBg", "gameBg.webp");
        this.load.image("backBtn", "backBtn.webp");
        this.load.image("howToBtn", "howToBtn.webp");
        this.load.image("fsBtn", "fsBtn.webp");
        this.load.image("singlePlayerBtn", "singlePlayerBtn.webp");
        this.load.image("multiPlayerBtn", "multiPlayerBtn.webp");
        this.load.image("boardFrame", "boardFrame.webp");
        this.load.image("sky", "sky.webp");
        this.load.image("hangingPlant", "hanging-plant.webp");
        this.load.spritesheet("howToSprite", "howto-sprite.webp", {
            frameWidth: 381,
            frameHeight: 314,
        });
        this.load.spritesheet("slot", "slot.webp", {
            frameWidth: 117,
            frameHeight: 117,
        });
        this.load.spritesheet("coin", "coin.webp", {
            frameWidth: 95,
            frameHeight: 95,
        });
        this.load.spritesheet("coffee", "coffee.webp", {
            frameWidth: 262,
            frameHeight: 291,
        });

        this.load.audio("coinDrop", "audio/CoinDrop-c4.mp3");
    }

    create() {
        this.anims.create({
            key: "howTo",
            frames: this.anims.generateFrameNumbers("howToSprite", {
                frames: [0, 1, 2, 3],
            }),
            frameRate: 2,
            repeat: -1,
        });
        this.anims.create({
            key: "coffee",
            frames: this.anims.generateFrameNumbers("coffee", {
                frames: [0, 1, 2],
            }),

            frameRate: 3,
            repeat: -1,
        });

        fadeToScene(this, "MainMenu", 1000);
    }
}
