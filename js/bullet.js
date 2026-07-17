// === 子弹 ===
// 子弹有: 位置, 方向, 速度, 威力, 所有者 (玩家/敌人)

class Bullet {
    constructor(x, y, direction, owner, power = 1) {
        // x, y 是坦克中心
        this.x = x;
        this.y = y;
        this.direction = direction; // 0=上, 1=右, 2=下, 3=左
        this.speed = 4;
        this.size = 6;
        this.owner = owner; // 'player' or 'enemy'
        this.power = power;
        this.alive = true;
    }

    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            w: this.size,
            h: this.size,
        };
    }

    update() {
        const dx = [0, 1, 0, -1][this.direction];
        const dy = [-1, 0, 1, 0][this.direction];
        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // 飞出地图
        if (this.x < 0 || this.x > 416 || this.y < 0 || this.y > 416) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        const b = this.getBounds();
        // 子弹主体
        ctx.fillStyle = this.owner === 'player' ? '#fff700' : '#ff5252';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // 高光
        ctx.fillStyle = this.owner === 'player' ? '#fff' : '#ffaaaa';
        ctx.fillRect(b.x + 1, b.y + 1, 2, 2);
    }
}
