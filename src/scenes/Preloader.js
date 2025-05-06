import { Scene } from "phaser";
import globals from "../globals";

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
        this.load.setPath("assets");

        this.load.image("title", "title.png");
        this.load.image("howTo", "howTo.png");
        this.load.image("gameBg", "gameBg.png");
        this.load.image("startBtn", "startBtn.png");
        this.load.image("howToBtn", "howToBtn.png");
        this.load.image("boardFrame", "boardFrame.png");
        this.load.spritesheet("howToSprite", "howto-sprite.png", {
            frameWidth: 381,
            frameHeight: 314,
        });
        this.load.spritesheet("slot", "slot.png", {
            frameWidth: 117,
            frameHeight: 117,
        });
        this.load.spritesheet("coin", "coin.png", {
            frameWidth: 95,
            frameHeight: 95,
        });
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

        this.time.delayedCall(1000, () => {
            this.cameras.main.fadeOut(1000);
            this.cameras.main.once("camerafadeoutcomplete", () => {
                this.scene.start("MainMenu");
            });
        });
    }
}
