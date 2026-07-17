// === 音效 (Web Audio API 合成, 无需外部文件) ===
const Audio = (() => {
    let ctx = null;
    let muted = false;

    function ensureCtx() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API 不可用', e);
                return null;
            }
        }
        // 某些浏览器需要 resume
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    // 通用 beep 函数
    function beep(freq, duration, type = 'square', volume = 0.1) {
        if (muted) return;
        const c = ensureCtx();
        if (!c) return;

        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + duration);
    }

    return {
        // 用户首次交互后才能用, 这里做一次尝试
        unlock() { ensureCtx(); },

        setMuted(v) { muted = v; },
        isMuted() { return muted; },
        toggleMute() { muted = !muted; return muted; },

        // === 各种游戏音效 ===
        shoot() { beep(880, 0.05, 'square', 0.08); },
        hit() { beep(220, 0.08, 'sawtooth', 0.1); },
        explosion() {
            // 模拟爆炸: 低频噪声
            if (muted) return;
            const c = ensureCtx();
            if (!c) return;
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, c.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.4);
            gain.gain.setValueAtTime(0.15, c.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start();
            osc.stop(c.currentTime + 0.4);
        },
        powerup() {
            beep(523, 0.1, 'sine', 0.1);
            setTimeout(() => beep(659, 0.1, 'sine', 0.1), 100);
            setTimeout(() => beep(784, 0.1, 'sine', 0.1), 200);
        },
        levelStart() {
            beep(440, 0.1, 'sine', 0.08);
            setTimeout(() => beep(660, 0.1, 'sine', 0.08), 100);
            setTimeout(() => beep(880, 0.2, 'sine', 0.08), 200);
        },
        gameOver() {
            beep(440, 0.2, 'sawtooth', 0.1);
            setTimeout(() => beep(330, 0.2, 'sawtooth', 0.1), 200);
            setTimeout(() => beep(220, 0.4, 'sawtooth', 0.1), 400);
        },
        move() { /* 暂时关闭, 太频繁 */ },
    };
})();
