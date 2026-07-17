// === 坦克 ===
// 玩家和敌人共用 Tank 类, 通过 isPlayer / ai 区分
//
// 玩家可升级 (star powerup): 0=基础, 1=快速, 2=双弹, 3=可打钢
// 敌人有 4 种: basic, fast, power, armor

const DIRECTIONS = {
    UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3,
};

const DIR_DX = [0, 1, 0, -1];
const DIR_DY = [-1, 0, 1, 0];

class Tank {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = 28; // 比 tile 小一点
        this.type = type; // 'player' / 'enemy_basic' / 'enemy_fast' / 'enemy_power' / 'enemy_armor'
        this.direction = type === 'player' ? DIRECTIONS.UP : DIRECTIONS.DOWN;
        this.alive = true;
        this.bullets = []; // 玩家可以同时存在的子弹数
        this.maxBullets = 1;
        this.bulletPower = 1;
        this.shieldTime = 0; // 护盾剩余时间 (ms)
        this.powerShotTime = 0; // 强化弹剩余时间
        this.spawnTime = Date.now();
        this.spawnProtection = 2000; // 出生 2 秒无敌

        // 敌人 AI 状态
        this.aiMoveTimer = 0;
        this.aiShootTimer = 0;
        this.aiChangeDirInterval = 1000;

        // 动画: 履带轮
        this.treadPhase = 0;
        this.moved = false;

        this.setStatsByType();
    }

    setStatsByType() {
        switch (this.type) {
            case 'player':
                this.speed = 1.0;       // 经典 Battle City 1px/frame 手感
                this.maxBullets = 100;  // 无限火力 (设大点, 加上死亡清理, 实际等于无限)
                this.bulletPower = 1;
                break;
            case 'enemy_basic':
                this.speed = 0.7;       // 慢, 让你能躲
                this.maxBullets = 1;
                this.bulletPower = 1;
                this.aiChangeDirInterval = 1500;
                break;
            case 'enemy_fast':
                this.speed = 1.4;       // 跟玩家差不多
                this.maxBullets = 1;
                this.bulletPower = 1;
                this.aiChangeDirInterval = 800;
                break;
            case 'enemy_power':
                this.speed = 0.9;
                this.maxBullets = 1;
                this.bulletPower = 2;    // 可打钢
                this.aiChangeDirInterval = 1200;
                break;
            case 'enemy_armor':
                this.speed = 0.8;
                this.maxBullets = 1;
                this.bulletPower = 1;
                this.armor = 4;         // 4 发才死
                this.aiChangeDirInterval = 1300;
                break;
        }
    }

    getBounds() {
        return { x: this.x - this.size/2, y: this.y - this.size/2, w: this.size, h: this.size };
    }

    isPlayer() { return this.type === 'player'; }
    isEnemy() { return !this.isPlayer(); }

    hasShield() { return this.shieldTime > 0; }
    isSpawning() { return Date.now() - this.spawnTime < this.spawnProtection; }

    upgrade() {
        // 升级玩家: speed 1, 2, 3 -> max 3 (0=基础, 1=快速, 2=双弹, 3=可打钢)
        if (this.maxBullets < 2) {
            this.maxBullets = 2;
        } else if (this.bulletPower < 2) {
            this.bulletPower = 2;
            this.speed = 2.2; // 升到顶
        }
    }

    shield(ms) { this.shieldTime = Math.max(this.shieldTime, ms); }
    powerShot(ms) { this.powerShotTime = Math.max(this.powerShotTime, ms); }

    // 尝试向当前方向移动
    tryMove(game) {
        if (this.shieldTime > 0) this.shieldTime -= 16;
        if (this.powerShotTime > 0) this.powerShotTime -= 16;

        const dx = DIR_DX[this.direction];
        const dy = DIR_DY[this.direction];
        const nx = this.x + dx * this.speed;
        const ny = this.y + dy * this.speed;

        // 边界
        if (nx - this.size/2 < 0 || nx + this.size/2 > 416
         || ny - this.size/2 < 0 || ny + this.size/2 > 416) {
            return false;
        }

        // 撞墙
        if (game.collidesWithWall(this.getBoundsAt(nx, ny))) {
            return false;
        }

        // 撞其他坦克
        if (game.collidesWithTank(this, nx, ny)) {
            return false;
        }

        this.x = nx;
        this.y = ny;
        this.moved = true;
        return true;
    }

    getBoundsAt(x, y) {
        return { x: x - this.size/2, y: y - this.size/2, w: this.size, h: this.size };
    }

    rotate(dir) {
        if (this.direction !== dir) {
            this.direction = dir;
        }
    }

    shoot() {
        if (this.bullets.length >= this.maxBullets) return null;
        const power = this.powerShotTime > 0 ? this.bulletPower + 1 : this.bulletPower;
        const dx = DIR_DX[this.direction];
        const dy = DIR_DY[this.direction];
        const bullet = new Bullet(
            this.x + dx * (this.size/2 + 4),
            this.y + dy * (this.size/2 + 4),
            this.direction,
            this.isPlayer() ? 'player' : 'enemy',
            power
        );
        // 子弹速度: 强化弹更快
        if (this.powerShotTime > 0) bullet.speed = 6;
        this.bullets.push(bullet);
        Audio.shoot();
        return bullet;
    }

    takeHit() {
        if (this.hasShield() || this.isSpawning()) return false;
        if (this.type === 'enemy_armor') {
            this.armor--;
            if (this.armor <= 0) {
                this.alive = false;
                return true;
            }
            return false;
        }
        this.alive = false;
        return true;
    }

    // === AI ===
    updateAI(game, frozen) {
        if (frozen) {
            this.aiShootTimer = 0;
            return;
        }
        this.aiMoveTimer += 16;
        this.aiShootTimer += 16;

        // 随机换方向
        if (this.aiMoveTimer > this.aiChangeDirInterval) {
            this.aiMoveTimer = 0;
            // 50% 概率换方向
            if (Math.random() < 0.5) {
                this.direction = Math.floor(Math.random() * 4);
            }
        }

        // 试着移动
        const moved = this.tryMove(game);
        if (!moved) {
            // 撞了, 立刻换方向
            this.direction = Math.floor(Math.random() * 4);
            this.aiMoveTimer = 0;
        }

        // 随机射击
        if (this.aiShootTimer > 800 + Math.random() * 600) {
            this.aiShootTimer = 0;
            const bullet = this.shoot();
            if (bullet) game.bullets.push(bullet);
        }
    }

    updateAnimation() {
        if (this.moved) {
            this.treadPhase = (this.treadPhase + 1) % 4;
            this.moved = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        // 护盾
        if (this.hasShield()) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.7 + 2 + Math.sin(Date.now()/100) * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        // 出生保护闪烁
        if (this.isSpawning() && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }

        // 坦克本体
        this.drawBody(ctx);
        // 履带
        this.drawTreads(ctx);
        // 炮塔
        this.drawTurret(ctx);
    }

    getColor() {
        if (this.type === 'player') return '#7fdb7f';
        if (this.type === 'enemy_basic') return '#c0c0c0';
        if (this.type === 'enemy_fast') return '#ff7f50';
        if (this.type === 'enemy_power') return '#5dade2';
        if (this.type === 'enemy_armor') return '#f4d03f';
        return '#888';
    }

    drawBody(ctx) {
        const c = this.getColor();
        const b = this.getBounds();
        ctx.fillStyle = c;
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 4);

        // 装甲敌人显示血量
        if (this.type === 'enemy_armor') {
            ctx.fillStyle = '#fff';
            const dots = ['•', '••', '•••', '••••'];
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(dots[this.armor - 1] || '', this.x, this.y - this.size/2 - 4);
        }
    }

    drawTreads(ctx) {
        const b = this.getBounds();
        ctx.fillStyle = '#222';
        // 左右履带
        ctx.fillRect(b.x, b.y, 4, b.h);
        ctx.fillRect(b.x + b.w - 4, b.y, 4, b.h);
        // 履带轮 (动画)
        ctx.fillStyle = '#555';
        const off = (this.treadPhase % 2) * 2;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(b.x, b.y + 4 + i * 8 + off, 4, 4);
            ctx.fillRect(b.x + b.w - 4, b.y + 4 + i * 8 + off, 4, 4);
        }
    }

    drawTurret(ctx) {
        const dx = DIR_DX[this.direction];
        const dy = DIR_DY[this.direction];
        // 圆心
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
        // 炮管
        ctx.strokeStyle = this.getColor();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + dx * (this.size/2 + 2), this.y + dy * (this.size/2 + 2));
        ctx.stroke();
    }
}
