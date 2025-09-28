// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    'cyan', // I
    'blue', // J
    'orange', // L
    'yellow', // O
    'green', // S
    'purple', // T
    'red' // Z
];

// 方块形状定义
const SHAPES = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]], // J
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]], // L
    [[1, 1], [1, 1]], // O
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]], // S
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]], // T
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]] // Z
];

// 游戏状态
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropStart = Date.now();
let soundEnabled = true;

// 获取DOM元素
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');

// 音效元素
const clearSound = document.getElementById('clear-sound');
const moveSound = document.getElementById('move-sound');
const rotateSound = document.getElementById('rotate-sound');
const dropSound = document.getElementById('drop-sound');
const gameoverSound = document.getElementById('gameover-sound');

// 初始化游戏板
function initBoard() {
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
}

// 绘制游戏板
function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawBlock(c, r, board[r][c]);
        }
    }
}

// 绘制方块
function drawBlock(x, y, colorIndex) {
    if (colorIndex === 0) {
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#111';
    } else {
        ctx.fillStyle = COLORS[colorIndex - 1];
        ctx.strokeStyle = 'black';
    }
    
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // 添加高光效果
    if (colorIndex !== 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE / 4);
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE / 4, BLOCK_SIZE);
    }
}

// 方块类
class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = 3;
        this.y = 0;
    }
    
    // 绘制当前方块
    draw() {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (this.shape[r][c]) {
                    drawBlock(this.x + c, this.y + r, this.color);
                }
            }
        }
    }
    
    // 擦除当前方块
    undraw() {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (this.shape[r][c]) {
                    drawBlock(this.x + c, this.y + r, 0);
                }
            }
        }
    }
    
    // 向下移动
    moveDown() {
        if (!this.collision(0, 1)) {
            this.undraw();
            this.y++;
            this.draw();
            return true;
        }
        this.lock();
        currentPiece = nextPiece;
        nextPiece = randomPiece();
        drawNextPiece();
        
        // 只有当新生成的方块一开始就发生碰撞时才判定游戏结束
        if (currentPiece.y === 0 && currentPiece.collision(0, 0)) {
            gameOver = true;
            if (soundEnabled) {
                gameoverSound.play();
            }
        }
        
        return false;
    }
    
    // 向左移动
    moveLeft() {
        if (!this.collision(-1, 0)) {
            this.undraw();
            this.x--;
            this.draw();
            if (soundEnabled) {
                moveSound.play();
            }
        }
    }
    
    // 向右移动
    moveRight() {
        if (!this.collision(1, 0)) {
            this.undraw();
            this.x++;
            this.draw();
            if (soundEnabled) {
                moveSound.play();
            }
        }
    }
    
    // 旋转方块
    rotate() {
        let nextPattern = [];
        for (let r = 0; r < this.shape.length; r++) {
            nextPattern[r] = [];
            for (let c = 0; c < this.shape[r].length; c++) {
                nextPattern[r][c] = this.shape[c][this.shape.length - 1 - r];
            }
        }
        
        // 检查旋转后是否会碰撞
        let originalShape = this.shape;
        this.shape = nextPattern;
        
        if (this.collision(0, 0)) {
            this.shape = originalShape; // 如果会碰撞，恢复原来的形状
        } else {
            this.undraw();
            this.shape = nextPattern;
            this.draw();
            if (soundEnabled) {
                rotateSound.play();
            }
        }
    }
    
    // 碰撞检测
    collision(x, y) {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (!this.shape[r][c]) {
                    continue;
                }
                
                let newX = this.x + c + x;
                let newY = this.y + r + y;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY < 0) {
                    continue;
                }
                
                if (board[newY][newX]) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // 锁定方块
    lock() {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (!this.shape[r][c]) {
                    continue;
                }
                
                if (this.y + r < 0) {
                    gameOver = true;
                    break;
                }
                
                board[this.y + r][this.x + c] = this.color;
            }
        }
        
        // 检查是否有完整的行
        let linesCleared = 0;
        for (let r = 0; r < ROWS; r++) {
            let isRowFull = true;
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] === 0) {
                    isRowFull = false;
                    break;
                }
            }
            
            if (isRowFull) {
                // 清除该行并向下移动上面的行
                for (let y = r; y > 0; y--) {
                    for (let c = 0; c < COLS; c++) {
                        board[y][c] = board[y-1][c];
                    }
                }
                
                // 顶部行清零
                for (let c = 0; c < COLS; c++) {
                    board[0][c] = 0;
                }
                
                linesCleared++;
            }
        }
        
        // 更新分数
        if (linesCleared > 0) {
            lines += linesCleared;
            score += linesCleared * 100 * level;
            
            // 每清除10行升一级
            level = Math.floor(lines / 10) + 1;
            
            // 更新UI
            scoreElement.textContent = score;
            levelElement.textContent = level;
            linesElement.textContent = lines;
            
            if (soundEnabled) {
                clearSound.play();
            }
        } else {
            if (soundEnabled) {
                dropSound.play();
            }
        }
    }
    
    // 快速下降
    hardDrop() {
        while (this.moveDown()) {
            // 持续下降直到不能再下降
        }
    }
}

// 生成随机方块
function randomPiece() {
    let randomIndex = Math.floor(Math.random() * SHAPES.length);
    return new Piece(SHAPES[randomIndex], randomIndex + 1);
}

// 绘制下一个方块预览
function drawNextPiece() {
    // 清除画布
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    // 计算居中位置
    let centerX = (nextCanvas.width / BLOCK_SIZE - nextPiece.shape[0].length) / 2;
    let centerY = (nextCanvas.height / BLOCK_SIZE - nextPiece.shape.length) / 2;
    
    // 绘制下一个方块
    for (let r = 0; r < nextPiece.shape.length; r++) {
        for (let c = 0; c < nextPiece.shape[r].length; c++) {
            if (nextPiece.shape[r][c]) {
                // 绘制方块
                let x = (centerX + c) * BLOCK_SIZE;
                let y = (centerY + r) * BLOCK_SIZE;
                
                nextCtx.fillStyle = COLORS[nextPiece.color - 1];
                nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                nextCtx.strokeStyle = 'black';
                nextCtx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                
                // 添加高光效果
                nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                nextCtx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE / 4);
                nextCtx.fillRect(x, y, BLOCK_SIZE / 4, BLOCK_SIZE);
            }
        }
    }
}

// 绘制网格
function drawGrid() {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    
    // 绘制垂直线
    for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
        ctx.stroke();
    }
}

// 键盘控制
document.addEventListener('keydown', function(e) {
    // 允许R键在任何情况下都可以重新开始游戏
    if (e.keyCode === 82) { // R键
        resetGame();
        return;
    }
    
    if (gameOver) return;
    
    switch(e.keyCode) {
        case 37: // 左箭头
            if (!isPaused) currentPiece.moveLeft();
            break;
        case 38: // 上箭头
            if (!isPaused) currentPiece.rotate();
            break;
        case 39: // 右箭头
            if (!isPaused) currentPiece.moveRight();
            break;
        case 40: // 下箭头
            if (!isPaused) currentPiece.moveDown();
            break;
        case 32: // 空格键
            isPaused = !isPaused;
            break;
        case 77: // M键
            soundEnabled = !soundEnabled;
            break;
        case 81: // Q键
            gameOver = true;
            break;
    }
});

// 游戏循环
function gameLoop() {
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'red';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`最终分数: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText('按R键重新开始', canvas.width / 2, canvas.height / 2 + 40);
        
        return;
    }
    
    if (!isPaused) {
        let now = Date.now();
        let delta = now - dropStart;
        
        // 根据等级调整下落速度
        if (delta > 1000 - (level - 1) * 100) {
            currentPiece.moveDown();
            dropStart = now;
        }
    } else {
        // 暂停状态
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('按空格键继续', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    requestAnimationFrame(gameLoop);
}

// 重置游戏
function resetGame() {
    // 重置游戏状态
    initBoard();
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    isPaused = false;
    
    // 更新UI
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
    
    // 生成新方块
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    
    // 绘制游戏板和网格
    drawBoard();
    drawGrid();
    drawNextPiece();
    
    // 重新开始游戏循环
    dropStart = Date.now();
    requestAnimationFrame(gameLoop);
}

// 处理音效加载错误
function handleAudioErrors() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.onerror = function() {
            console.log('音效加载失败，游戏将继续但没有音效');
            soundEnabled = false;
        };
    });
}

// 初始化游戏
function init() {
    handleAudioErrors();
    initBoard();
    drawBoard();
    drawGrid();
    
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    drawNextPiece();
    
    gameLoop();
}

// 启动游戏
window.onload = init;