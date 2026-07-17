// === 墙/障碍物 ===
// 类型 (来自 Levels.WALL_TYPES):
//   BRICK 砖 - 可被子弹打碎
//   STEEL 钢 - 普通子弹打不碎
//   GRASS 草 - 坦克可穿过, 子弹可穿过
//   WATER 水 - 坦克不可过, 子弹可穿过
//   ICE   冰 - 坦克打滑 (这里简化: 坦克速度临时翻倍)
//   EAGLE 基地 - 必须保护, 被碰到就 Game Over

const TILE_SIZE = 32;

class Wall {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = TILE_SIZE;
        this.alive = true;
        // 砖墙被子弹打中会变成两半再变四分之一
        this.brickHealth = 4;
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.size, h: this.size };
    }

    // 坦克能否通过
    isPassableForTank() {
        return this.type === Levels.WALL_TYPES.EMPTY
            || this.type === Levels.WALL_TYPES.GRASS;
    }

    // 子弹能否通过
    isPassableForBullet() {
        return this.type === Levels.WALL_TYPES.EMPTY
            || this.type === Levels.WALL_TYPES.GRASS
            || this.type === Levels.WALL_TYPES.WATER
            || this.type === Levels.WALL_TYPES.ICE;
    }

    // 是否会破坏子弹 (子弹打到这上面会爆炸)
    blocksBullet() {
        return this.type === Levels.WALL_TYPES.BRICK
            || this.type === Levels.WALL_TYPES.STEEL
            || this.type === Levels.WALL_TYPES.EAGLE;
    }

    // 子弹打过来
    // power: 子弹威力 (1 普通, 2 加强)
    hit(power = 1) {
        if (this.type === Levels.WALL_TYPES.BRICK) {
            this.brickHealth -= power;
            if (this.brickHealth <= 0) {
                this.alive = false;
                return true;
            }
            return false;
        }
        if (this.type === Levels.WALL_TYPES.STEEL) {
            if (power >= 2) {
                this.alive = false;
                return true;
            }
            return false;
        }
        if (this.type === Levels.WALL_TYPES.EAGLE) {
            this.alive = false;
            return 'eagle_destroyed';
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive) return;
        const T = Levels.WALL_TYPES;
        switch (this.type) {
            case T.BRICK:
                this.drawBrick(ctx);
                break;
            case T.STEEL:
                this.drawSteel(ctx);
                break;
            case T.GRASS:
                this.drawGrass(ctx);
                break;
            case T.WATER:
                this.drawWater(ctx);
                break;
            case T.ICE:
                this.drawIce(ctx);
                break;
            case T.EAGLE:
                this.drawEagle(ctx);
                break;
        }
    }

    drawBrick(ctx) {
        // 4 块小砖, 每次挨打掉一块
        const x = this.x, y = this.y, s = this.size;
        ctx.fillStyle = '#a04020';
        const t = 14; // 每小块大小
        const ofs = 1;
        const offsets = [
            [ofs, ofs], [s/2 + ofs, ofs],
            [ofs, s/2 + ofs], [s/2 + ofs, s/2 + ofs],
        ];
        // 根据 health 显示哪几块
        const visible = 4 - (4 - this.brickHealth);
        for (let i = 0; i < visible; i++) {
            const [ox, oy] = offsets[i];
            ctx.fillRect(x + ox, y + oy, t, t);
            // 砖缝阴影
            ctx.fillStyle = '#6b2a14';
            ctx.fillRect(x + ox, y + oy + t - 2, t, 2);
            ctx.fillRect(x + ox + t - 2, y + oy, 2, t);
            ctx.fillStyle = '#a04020';
        }
    }

    drawSteel(ctx) {
        const x = this.x, y = this.y, s = this.size;
        ctx.fillStyle = '#7a7a8a';
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#9a9aaa';
        ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(x + 4, y + 4, 4, s - 8);
        ctx.fillRect(x + 4, y + 4, s - 8, 4);
    }

    drawGrass(ctx) {
        const x = this.x, y = this.y, s = this.size;
        ctx.fillStyle = '#2d5a2d';
        ctx.fillRect(x, y, s, s);
        // 草叶
        ctx.fillStyle = '#4a8a3a';
        const dot = (cx, cy) => ctx.fillRect(x + cx, y + cy, 3, 3);
        dot(4, 6); dot(10, 4); dot(16, 8); dot(22, 6);
        dot(6, 14); dot(14, 16); dot(20, 14); dot(26, 12);
        dot(4, 22); dot(10, 24); dot(18, 22); dot(24, 24);
    }

    drawWater(ctx) {
        const x = this.x, y = this.y, s = this.size;
        ctx.fillStyle = '#1e4d7b';
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#3a7bc8';
        // 简单的波纹
        const t = (Date.now() / 500) % 2;
        const off = t < 1 ? 0 : 4;
        ctx.fillRect(x + 4, y + 6 + off, 8, 3);
        ctx.fillRect(x + 18, y + 4 + off, 6, 3);
        ctx.fillRect(x + 8, y + 18 + off, 10, 3);
        ctx.fillRect(x + 22, y + 20 + off, 6, 3);
    }

    drawIce(ctx) {
        const x = this.x, y = this.y, s = this.size;
        ctx.fillStyle = '#cce6ff';
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 4, 6, 6);
        ctx.fillRect(x + 20, y + 8, 4, 4);
    }

    drawEagle(ctx) {
        const x = this.x, y = this.y, s = this.size;
        // 底座
        ctx.fillStyle = '#555';
        ctx.fillRect(x + 2, y + 8, s - 4, s - 8);
        // 鹰
        ctx.fillStyle = '#ffd700';
        // 头
        ctx.beginPath();
        ctx.arc(x + s/2, y + 12, 6, 0, Math.PI * 2);
        ctx.fill();
        // 身体
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.moveTo(x + s/2, y + 8);
        ctx.lineTo(x + 6, y + s - 4);
        ctx.lineTo(x + s - 6, y + s - 4);
        ctx.closePath();
        ctx.fill();
        // 翅膀
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + 8, y + 16, 6, 4);
        ctx.fillRect(x + s - 14, y + 16, 6, 4);
    }
}
