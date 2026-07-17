// === 游戏主类 ===
// 管理所有实体 (墙/坦克/子弹/道具), 主循环, 状态, 分数

const TILE = TILE_SIZE;
const GRID = 13; // 13x13
const CANVAS_SIZE = TILE * GRID; // 416

// 全局常量 (供其他模块用)
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameover',
    LEVEL_COMPLETE: 'levelcomplete',
    WIN: 'win',
};

const SCORE_TABLE = {
    enemy_basic: 100,
    enemy_fast: 200,
    enemy_power: 300,
    enemy_armor: 400,
};

class Game {
    constructor(canvas, hud) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.hud = hud;

        this.state = GAME_STATES.MENU;
        this.level = 0;
        this.score = 0;
        this.lives = 3;
        this.enemiesRemaining = 0;
        this.enemiesOnField = [];
        this.enemiesToSpawn = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;

        this.walls = [];
        this.player = null;
        this.bullets = [];
        this.powerups = [];
        this.sparks = []; // 子弹撞抵消时的火花粒子

        this.frozenTime = 0;
        this.baseProtectedTime = 0;
        this.baseDestroyed = false;

        this.flashAlpha = 0; // 受伤闪屏
        this.lastFrame = 0;
        this.animFrame = 0;

        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // 这里不做处理, 主循环里调 Input
    }

    // === 初始化一关 ===
    startLevel(level) {
        this.level = level;
        const map = Levels.getMap(level);
        this.walls = [];

        // 从地图数据建墙
        for (let r = 0; r < GRID; r++) {
            for (let c = 0; c < GRID; c++) {
                const t = map[r][c];
                if (t !== Levels.WALL_TYPES.EMPTY) {
                    this.walls.push(new Wall(c * TILE, r * TILE, t));
                }
            }
        }

        // 玩家初始位置 (底部中间偏左)
        this.player = new Tank(4 * TILE + TILE/2, 12 * TILE + TILE/2, 'player');
        this.player.lives = this.lives;

        this.bullets = [];
        this.powerups = [];
        this.enemiesOnField = [];
        this.enemiesToSpawn = Levels.getEnemyCount(level);
        this.enemiesRemaining = this.enemiesToSpawn;
        this.spawnQueue = this.makeSpawnQueue();
        this.spawnTimer = 0;
        this.frozenTime = 0;
        this.baseProtectedTime = 0;
        this.baseDestroyed = false;

        this.state = GAME_STATES.PLAYING;
        this.updateHUD();
        Audio.levelStart();
    }

    // 生成敌人队列: 4 种敌人各 5 个
    makeSpawnQueue() {
        const types = ['enemy_basic', 'enemy_basic', 'enemy_basic', 'enemy_basic', 'enemy_basic',
                       'enemy_fast', 'enemy_fast', 'enemy_fast', 'enemy_fast', 'enemy_fast',
                       'enemy_power', 'enemy_power', 'enemy_power', 'enemy_power', 'enemy_power',
                       'enemy_armor', 'enemy_armor', 'enemy_armor', 'enemy_armor', 'enemy_armor'];
        // 简单洗牌
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        return types;
    }

    spawnEnemy() {
        if (this.spawnQueue.length === 0) return;
        // 3 个出生点: 左上, 中上, 右上
        const spawns = [
            { x: 0 * TILE + TILE/2, y: 0 * TILE + TILE/2 },
            { x: 6 * TILE + TILE/2, y: 0 * TILE + TILE/2 },
            { x: 12 * TILE + TILE/2, y: 0 * TILE + TILE/2 },
        ];
        for (const s of spawns) {
            const occupied = this.enemiesOnField.some(e =>
                Math.abs(e.x - s.x) < TILE && Math.abs(e.y - s.y) < TILE
            ) || (this.player && Math.abs(this.player.x - s.x) < TILE && Math.abs(this.player.y - s.y) < TILE);
            if (!occupied) {
                const type = this.spawnQueue.shift();
                const e = new Tank(s.x, s.y, type);
                this.enemiesOnField.push(e);
                return;
            }
        }
    }

    // === 主循环 ===
    update(dt) {
        if (dt > 100) dt = 100; // 防卡顿后大跳
        this.animFrame += dt;

        // 全局计时
        if (this.frozenTime > 0) this.frozenTime -= dt;
        if (this.baseProtectedTime > 0) this.baseProtectedTime -= dt;
        if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt / 500);

        // 闪屏效果: 基地被毁后一直红
        if (this.baseDestroyed) this.flashAlpha = 0.3;

        // 按键: 全局
        if (Input.wasPressed('mute')) {
            const m = Audio.toggleMute();
            this.showOverlay(m ? '已静音 (M 解除)' : '已开启音效', 1000);
        }
        if (Input.wasPressed('restart')) {
            this.restart();
        }

        if (this.state === GAME_STATES.MENU) {
            if (Input.wasPressed('shoot') || Input.wasPressed('confirm')) {
                this.lives = 3;
                this.score = 0;
                this.startLevel(0);
            }
        } else if (this.state === GAME_STATES.PLAYING) {
            if (Input.wasPressed('pause')) {
                this.state = GAME_STATES.PAUSED;
                this.showOverlay('⏸ 暂停\n按 P 继续', 999999);
                return;
            }
            this.updatePlaying(dt);
        } else if (this.state === GAME_STATES.PAUSED) {
            if (Input.wasPressed('pause')) {
                this.hideOverlay();
                this.state = GAME_STATES.PLAYING;
            }
        } else if (this.state === GAME_STATES.GAME_OVER || this.state === GAME_STATES.WIN) {
            if (Input.wasPressed('shoot') || Input.wasPressed('confirm')) {
                this.state = GAME_STATES.MENU;
                this.showMenu();
            }
        } else if (this.state === GAME_STATES.LEVEL_COMPLETE) {
            if (Input.wasPressed('shoot') || Input.wasPressed('confirm')) {
                this.hideOverlay();
                this.startLevel(this.level + 1);
            }
        }
    }

    updatePlaying(dt) {
        // 玩家
        this.handlePlayerInput();
        this.player.updateAnimation();

        // 道具
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            this.powerups[i].update();
            if (!this.powerups[i].alive) {
                this.powerups.splice(i, 1);
                continue;
            }
            // 玩家捡到
            if (this.player.alive && this.collide(this.player.getBounds(), this.powerups[i].getBounds())) {
                const msg = this.powerups[i].applyTo(this.player, this);
                if (msg) {
                    Audio.powerup();
                    this.showOverlay(`✨ ${msg}`, 1200);
                }
                this.powerups.splice(i, 1);
            }
        }

        // 敌人 AI
        const frozen = this.frozenTime > 0;
        for (const e of this.enemiesOnField) {
            e.updateAI(this, frozen);
            e.updateAnimation();
        }

        // 出生敌人
        this.spawnTimer += dt;
        if (this.spawnTimer > 1500 && this.enemiesOnField.length < 4 && this.spawnQueue.length > 0) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // 子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update();
            if (!b.alive) {
                this.bullets.splice(i, 1);
                continue;
            }
            this.checkBulletHit(b, i);
        }

        // 清理已死亡的子弹 (从坦克自己的 bullets 数组里), 不然 maxBullets 永远卡满
        if (this.player) {
            this.player.bullets = this.player.bullets.filter(b => b.alive);
        }
        for (const e of this.enemiesOnField) {
            e.bullets = e.bullets.filter(b => b.alive);
        }

        // 玩家子弹 vs 玩家 (不能打自己)
        // 敌人子弹 vs 玩家
        // 玩家子弹 vs 敌人
        // 子弹 vs 子弹 (任何阵营相撞都抵消, 喷火花)
        this.checkBulletCollisions();
        this.updateSparks();

        // 敌人死亡 -> 30% 掉道具
        for (let i = this.enemiesOnField.length - 1; i >= 0; i--) {
            if (!this.enemiesOnField[i].alive) {
                const e = this.enemiesOnField[i];
                this.addScore(SCORE_TABLE[e.type] || 100);
                if (Math.random() < 0.3) {
                    this.powerups.push(new PowerUp(e.x, e.y));
                }
                this.enemiesOnField.splice(i, 1);
                this.enemiesRemaining = this.spawnQueue.length + this.enemiesOnField.length;
                Audio.explosion();
            }
        }

        // 玩家死亡
        if (this.player && !this.player.alive) {
            this.lives--;
            this.flashAlpha = 1;
            if (this.lives <= 0) {
                this.gameOver();
                return;
            } else {
                // 重生
                this.player = new Tank(4 * TILE + TILE/2, 12 * TILE + TILE/2, 'player');
                this.player.lives = this.lives;
            }
        }

        // 基地保护
        if (this.baseProtectedTime > 0) {
            // 基地周围 4x2 区域强制设钢
            for (let r = 11; r <= 12; r++) {
                for (let c = 5; c <= 7; c++) {
                    const w = this.walls.find(w => w.x === c * TILE && w.y === r * TILE);
                    if (w && w.type !== Levels.WALL_TYPES.STEEL) {
                        w.type = Levels.WALL_TYPES.STEEL;
                        w.alive = true;
                    }
                }
            }
        } else {
            // 时间到, 还原成砖
            for (let r = 11; r <= 12; r++) {
                for (let c = 5; c <= 7; c++) {
                    const w = this.walls.find(w => w.x === c * TILE && w.y === r * TILE);
                    if (w && w.type === Levels.WALL_TYPES.STEEL) {
                        // 检查是否本来就是钢
                        const orig = Levels.getMap(this.level)[r][c];
                        if (orig !== Levels.WALL_TYPES.STEEL) {
                            w.type = Levels.WALL_TYPES.BRICK;
                            w.brickHealth = 4;
                        }
                    }
                }
            }
        }

        // 基地被毁
        if (this.baseDestroyed) {
            this.gameOver();
            return;
        }

        // 通关条件
        if (this.enemiesRemaining === 0 && this.enemiesOnField.length === 0 && this.spawnQueue.length === 0) {
            if (this.level >= 2) {
                this.win();
            } else {
                this.state = GAME_STATES.LEVEL_COMPLETE;
                this.showOverlay(`🎉 第 ${this.level + 1} 关通过!\n\n按 [空格] 进下一关`, 999999);
            }
        }

        this.updateHUD();
    }

    handlePlayerInput() {
        if (!this.player || !this.player.alive) return;
        if (Input.isDown('up')) this.player.rotate(DIRECTIONS.UP);
        else if (Input.isDown('down')) this.player.rotate(DIRECTIONS.DOWN);
        else if (Input.isDown('left')) this.player.rotate(DIRECTIONS.LEFT);
        else if (Input.isDown('right')) this.player.rotate(DIRECTIONS.RIGHT);

        // 朝当前方向移动
        this.player.tryMove(this);

        // === 无限火力 ===
        // 兼容两种手感:
        //   1) 点按一下射一发 (wasPressed) - 单发
        //   2) 长按连射 (isDown) - 无限火力
        // 长按时按 110ms 一发的节奏 (约 9 发/秒), 不会卡顿
        const now = performance.now();
        if (!this.playerShootCooldown) this.playerShootCooldown = 0;
        const canRapidFire = Input.isDown('shoot') && now >= this.playerShootCooldown;
        const canSingleFire = Input.wasPressed('shoot');
        if (canRapidFire || canSingleFire) {
            const bullet = this.player.shoot();
            if (bullet) {
                this.bullets.push(bullet);
                this.playerShootCooldown = now + 110;
            }
        }
    }

    checkBulletHit(bullet, idx) {
        const bb = bullet.getBounds();
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const w = this.walls[i];
            if (!w.alive) continue;
            if (this.collide(bb, w.getBounds())) {
                if (w.isPassableForBullet()) continue;
                if (w.blocksBullet()) {
                    const result = w.hit(bullet.power);
                    if (result === 'eagle_destroyed') {
                        this.baseDestroyed = true;
                        Audio.explosion();
                    } else if (result) {
                        // 墙被毁
                    }
                    Audio.hit();
                    bullet.alive = false;
                    this.bullets.splice(idx, 1);
                    return;
                }
            }
        }
    }

    checkBulletCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const a = this.bullets[i];
            if (!a.alive) continue;
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                if (i === j) continue;
                const b = this.bullets[j];
                if (!b.alive) continue;
                // 任何两颗子弹相撞都互相抵消 (不管同不同阵营)
                if (this.collide(a.getBounds(), b.getBounds())) {
                    // 碰撞点 = 两颗子弹中心的中点
                    const cx = (a.x + b.x) / 2;
                    const cy = (a.y + b.y) / 2;
                    this.spawnSparks(cx, cy);
                    a.alive = false;
                    b.alive = false;
                    this.bullets.splice(i, 1);
                    if (j > i) j--;
                    this.bullets.splice(j, 1);
                    Audio.hit();
                    break;
                }
            }
        }
    }

    // 子弹相撞的火花
    spawnSparks(x, y) {
        // 不同阵营颜色不同, 同阵营就白色
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
            const speed = 2 + Math.random() * 2;
            this.sparks.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 220, // ms
                maxLife: 220,
                size: 2 + Math.random() * 2,
            });
        }
    }

    updateSparks() {
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.92; // 摩擦
            s.vy *= 0.92;
            s.life -= 16;
            if (s.life <= 0) this.sparks.splice(i, 1);
        }
    }

    drawSparks(ctx) {
        for (const s of this.sparks) {
            const a = Math.max(0, s.life / s.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = '#fff8a0';
            ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    // 通用碰撞 (AABB)
    collide(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x
            && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    collidesWithWall(rect) {
        for (const w of this.walls) {
            if (!w.alive) continue;
            if (w.isPassableForTank()) continue;
            if (this.collide(rect, w.getBounds())) return true;
        }
        return false;
    }

    collidesWithTank(self, nx, ny) {
        const myBounds = self.getBoundsAt(nx, ny);
        if (self.isPlayer()) {
            for (const e of this.enemiesOnField) {
                if (!e.alive) continue;
                if (this.collide(myBounds, e.getBounds())) return true;
            }
        } else {
            if (this.player && this.player.alive
                && this.collide(myBounds, this.player.getBounds())) return true;
            for (const e of this.enemiesOnField) {
                if (e === self || !e.alive) continue;
                if (this.collide(myBounds, e.getBounds())) return true;
            }
        }
        return false;
    }

    // === 道具效果钩子 ===
    addScore(n) { this.score += n; }
    freezeEnemies(ms) { this.frozenTime = ms; }
    killAllEnemies() {
        for (const e of this.enemiesOnField) {
            e.alive = false;
        }
        this.addScore(2000);
    }
    protectBase(ms) { this.baseProtectedTime = ms; }

    // === 状态切换 ===
    gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        Audio.gameOver();
        this.showOverlay(`💀 游戏结束\n\n分数: ${this.score}\n\n按 [空格] 回到菜单`, 999999);
    }

    win() {
        this.state = GAME_STATES.WIN;
        Audio.gameOver(); // 用同一个尾音
        this.showOverlay(`🏆 通关! 全歼敌军!\n\n最终分数: ${this.score}\n\n按 [空格] 回到菜单`, 999999);
    }

    restart() {
        this.lives = 3;
        this.score = 0;
        this.startLevel(0);
    }

    showMenu() {
        this.showOverlay(`坦克大战\n\n按 [空格] 开始游戏`, 999999);
    }

    // === HUD ===
    updateHUD() {
        this.hud.level.textContent = (this.level + 1).toString();
        this.hud.score.textContent = this.score.toString();
        this.hud.lives.textContent = '♥'.repeat(Math.max(0, this.lives));
        this.hud.enemies.textContent = (this.spawnQueue.length + this.enemiesOnField.length).toString();
    }

    showOverlay(text, autoHide) {
        const ov = document.getElementById('overlay');
        document.getElementById('overlay-title').textContent = text.split('\n')[0];
        document.getElementById('overlay-message').innerHTML = text.split('\n').slice(1).join('<br>') || '&nbsp;';
        ov.classList.remove('hidden');
        if (autoHide && autoHide < 99999) {
            setTimeout(() => this.hideOverlay(), autoHide);
        }
    }

    hideOverlay() {
        const ov = document.getElementById('overlay');
        ov.classList.add('hidden');
    }

    // === 渲染 ===
    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // 墙
        for (const w of this.walls) w.draw(ctx);

        // 基地保护闪烁
        if (this.baseProtectedTime > 0 && Math.floor(Date.now() / 200) % 2 === 0) {
            // 提示: 画一圈闪光
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.strokeRect(5 * TILE - 2, 11 * TILE - 2, 3 * TILE + 4, 2 * TILE + 4);
        }

        // 道具
        for (const p of this.powerups) p.draw(ctx);

        // 玩家
        if (this.player) this.player.draw(ctx);

        // 敌人
        for (const e of this.enemiesOnField) e.draw(ctx);

        // 子弹
        for (const b of this.bullets) b.draw(ctx);

        // 子弹相撞的火花 (画在子弹上方, 但在特效下方)
        this.drawSparks(ctx);

        // 冰冻效果
        if (this.frozenTime > 0) {
            ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }

        // 受伤闪屏
        if (this.flashAlpha > 0) {
            ctx.fillStyle = `rgba(255, 50, 50, ${this.flashAlpha})`;
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }

        // 玩家和敌人子弹飞行时, 检查是否击中坦克
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.owner === 'player') {
                for (const e of this.enemiesOnField) {
                    if (!e.alive) continue;
                    if (this.collide(b.getBounds(), e.getBounds())) {
                        if (e.takeHit()) {
                            // 死
                        }
                        b.alive = false;
                        this.bullets.splice(i, 1);
                        Audio.hit();
                        break;
                    }
                }
            } else {
                if (this.player && this.player.alive
                    && this.collide(b.getBounds(), this.player.getBounds())) {
                    if (this.player.takeHit()) {
                        // 死
                    }
                    b.alive = false;
                    this.bullets.splice(i, 1);
                    Audio.hit();
                }
            }
        }
    }
}
