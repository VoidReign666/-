# 🛡️ 坦克大战 (Battle City)

一个用纯 HTML5 Canvas + 原生 JavaScript 实现的坦克大战游戏，致敬 1985 年 Namco 的经典 Battle City。

![Made with HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow)
![No Build](https://img.shields.io/badge/Build-None-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ 特性

- 🎮 **完整的 Battle City 复刻** — 玩家坦克、4 种敌人 AI、子弹、墙、道具、关卡进度
- 🎨 **纯 Canvas 绘制** — 无任何图片资源，0 外部依赖
- 🔊 **Web Audio 合成音效** — 射击/爆炸/道具/通关都用代码合成，无需音频文件
- 🏆 **3 个精心设计的关卡** — 简单 → 中等 → 困难 (含钢墙/水/冰)
- ⚡ **7 种道具** — 星、头盔、命、铲、钟、雷、枪
- 💀 **4 种敌人** — 基础、快速、强力 (可打钢)、装甲 (4 发才死)
- 📱 **响应式 HUD** — 分数、生命、关卡、剩余敌人实时显示
- ⌨️ **键盘控制** — WASD/方向键移动，空格射击，P 暂停，R 重开，M 静音

## 🚀 运行

### 方法 1: 直接双击打开
双击 `index.html` 即可在浏览器里玩。

### 方法 2: 用本地服务器 (推荐)
```bash
# Python 3
python -m http.server 8000

# 或者 Node.js
npx serve .

# 然后浏览器打开 http://localhost:8000
```

## 🎯 操作

| 按键 | 动作 |
|------|------|
| `↑` `↓` `←` `→` 或 `W` `A` `S` `D` | 移动坦克 |
| `空格` | 射击 |
| `P` | 暂停 / 继续 |
| `R` | 重新开始 |
| `M` | 静音 / 取消静音 |
| `Enter` | 确认 (开始/继续) |

## 🗺️ 关卡

| 关卡 | 难度 | 特色 |
|------|------|------|
| 1 | 入门 | 纯砖墙，布局简单 |
| 2 | 中等 | 加入钢墙、水域 |
| 3 | 困难 | 大量钢墙 + 冰地，坦克会打滑 |

每关 20 个敌人 (4 种类型随机)，全歼且基地未被毁 → 通关。

## 🏗️ 项目结构

```
坦克大战/
├── index.html              # 入口 HTML
├── css/
│   └── style.css           # 样式
├── js/
│   ├── main.js             # 入口
│   ├── game.js             # 主游戏类 (状态/循环/碰撞/计分)
│   ├── tank.js             # 坦克类 (玩家+敌人+AI)
│   ├── bullet.js           # 子弹类
│   ├── wall.js             # 墙/障碍物 (砖/钢/草/水/冰/基地)
│   ├── powerup.js          # 道具 (7 种效果)
│   ├── levels.js           # 3 关地图数据
│   ├── input.js            # 键盘输入
│   └── audio.js            # Web Audio 合成音效
├── README.md
└── .gitignore
```

## 🎨 道具说明

| 道具 | 效果 |
|------|------|
| ⭐ **星** | 升级坦克 (快速 → 双弹 → 可打钢) |
| 🪖 **头盔** | 8 秒护盾 |
| 🎖️ **坦克** | 加一条命 |
| 🛠️ **铲** | 基地周围 15 秒变钢墙 |
| 🕐 **钟** | 冻结所有敌人 8 秒 |
| 💣 **雷** | 立即全屏爆破所有敌人 |
| 🔫 **枪** | 10 秒内子弹加速 + 加强 |

## 🤝 贡献

欢迎 PR！可以加新关卡、新道具、新敌人类型。

## 📜 License

MIT — 随便用，别删原作者就行。
