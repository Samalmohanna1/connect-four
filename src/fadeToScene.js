// Fades the camera out over a second, then starts another scene.
export function fadeToScene(scene, key, delay = 10) {
    scene.time.delayedCall(delay, () => {
        scene.cameras.main.fadeOut(1000);
        scene.cameras.main.once("camerafadeoutcomplete", () => {
            scene.scene.start(key);
        });
    });
}
