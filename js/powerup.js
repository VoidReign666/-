// === 道具 (Power-up) ===
// 7 种: 星/头盔/命/铲/钟/雷/枪
// 敌人被打死后 30% 概率掉落, 持续 15 秒没人捡就消失

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 28;
        this.alive = true;
        this.spawnTime = Date.now();
        this.lifetime = 15000; // 15 秒
        // 随机一种类型
        this.type = Math.floor(Math.random() * 7);
        // 闪烁
        this.blinkPhase = 0;
    }

    isExpired() {
        return Date.now() - this.spawnTime > this.lifetime;
    }

    getBounds() {
        const half = this.size / 2;
        return { x: this.x - half, y: this.y - half, w: this.size, h: this.size };
    }

    update() {
        this.blinkPhase = (Date.now() / 200) % 2;
        if (this.isExpired()) this.alive = false;
    }

    // 应用效果到玩家
    applyTo(player, game) {
        switch (this.type) {
            case 0: // 星 - 升级 (max 3 级)
                player.upgrade();
                game.addScore(500);
                return '升级坦克!';
            case 1: // 头盔 - 8 秒护盾
                player.shield(8000);
                return '护盾!';
            case 2: // 命 - 加一条命
                player.lives++;
                game.addScore(500);
                return '加命!';
            case 3: // 铲 - 基地周围 15 秒变钢
                game.protectBase(15000);
                return '基地加固!';
            case 4: // 钟 - 8 秒冰冻所有敌人
                game.freezeEnemies(8000);
                return '敌人冻结!';
            case 5: // 雷 - 全歼所有敌人
                game.killAllEnemies();
                return '全屏爆破!';
            case 6: // 枪 - 临时不能动但子弹加速
                player.powerShot(10000);
                return '强化弹!';
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        // 闪烁: 接近过期时快闪
        if (this.isExpired() || (Date.now() - this.spawnTime > 10000 && this.blinkPhase < 1)) return;
        const b = this.getBounds();
        // 背景 (白圈)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        // 画图标
        ctx.fillStyle = '#000';
        this.drawIcon(ctx);
    }

    drawIcon(ctx) {
        const s = 4;
        const cx = this.x, cy = this.y;
        switch (this.type) {
            case 0: // 星
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const r = i % 2 === 0 ? 8 : 4;
                    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
                    else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
                }
                ctx.closePath();
                ctx.fill();
                break;
            case 1: // 头盔
                ctx.fillStyle = '#3498db';
                ctx.fillRect(cx - 8, cy - 4, 16, 8);
                ctx.fillRect(cx - 6, cy - 6, 12, 4);
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx - 2, cy - 1, 4, 4);
                break;
            case 2: // 命 (坦克)
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(cx - 8, cy - 6, 16, 12);
                ctx.fillStyle = '#000';
                ctx.fillRect(cx - 1, cy - 9, 2, 6);
                ctx.fillRect(cx - 4, cy - 1, 8, 2);
                break;
            case 3: // 铲
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(cx - 8, cy - 1, 16, 4);
                ctx.fillRect(cx - 8, cy - 5, 4, 8);
                ctx.fillRect(cx + 4, cy - 5, 4, 8);
                break;
            case 4: // 钟
                ctx.fillStyle = '#9b59b6';
                ctx.fillRect(cx - 6, cy - 4, 12, 8);
                ctx.fillStyle = '#000';
                ctx.fillRect(cx - 1, cy - 7, 2, 4);
                break;
            case 5: // 雷
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(cx - 1, cy - 8, 2, 4);
                break;
            case 6: // 枪
                ctx.fillStyle = '#34495e';
                ctx.fillRect(cx - 8, cy - 1, 14, 3);
                ctx.fillRect(cx + 4, cy - 4, 3, 9);
                break;
        }
    }
}
