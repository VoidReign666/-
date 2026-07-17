// === 入口 ===
// DOM 加载完成后启动游戏

let game = null;
let lastTime = 0;

function loop(t) {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;

    if (game) {
        game.update(dt);
        game.draw();
        Input.endFrame();
    }
    requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game');
    const hud = {
        level: document.getElementById('level'),
        score: document.getElementById('score'),
        lives: document.getElementById('lives'),
        enemies: document.getElementById('enemies'),
    };

    game = new Game(canvas, hud);
    game.showMenu();

    // 用户首次点击/按键时解锁 Audio
    const unlock = () => {
        Audio.unlock();
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('click', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('click', unlock);

    requestAnimationFrame(loop);
});
