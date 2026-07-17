// === 输入处理 (键盘) ===
const Input = (() => {
    const keys = new Set();
    const justPressed = new Set();
    const justReleased = new Set();

    // 按键到动作的映射
    const keyMap = {
        'ArrowUp': 'up', 'KeyW': 'up',
        'ArrowDown': 'down', 'KeyS': 'down',
        'ArrowLeft': 'left', 'KeyA': 'left',
        'ArrowRight': 'right', 'KeyD': 'right',
        'Space': 'shoot',
        'KeyP': 'pause',
        'KeyR': 'restart',
        'KeyM': 'mute',
        'Enter': 'confirm',
    };

    window.addEventListener('keydown', (e) => {
        const action = keyMap[e.code];
        if (action) {
            if (!keys.has(action)) {
                justPressed.add(action);
            }
            keys.add(action);
            // 防止方向键和空格滚动页面
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        const action = keyMap[e.code];
        if (action) {
            keys.delete(action);
            justReleased.add(action);
        }
    });

    // 失焦时清空所有按键, 防止坦克卡住
    window.addEventListener('blur', () => {
        keys.clear();
    });

    return {
        isDown(action) { return keys.has(action); },
        wasPressed(action) { return justPressed.has(action); },
        wasReleased(action) { return justReleased.has(action); },
        // 每帧结束调用, 清除 justPressed/justReleased
        endFrame() {
            justPressed.clear();
            justReleased.clear();
        },
    };
})();
