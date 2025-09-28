// 游戏常量
const COLS = 10;
const ROWS = 20; // 保持原始高度值
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
let gameStartTime = 0;
let gameTime = 0;

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
        this.y = -2; // 修改初始位置，使方块从顶部开始落下
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
        console.log("moveDown: 当前位置 x=" + this.x + ", y=" + this.y);
        console.log("moveDown: 检查碰撞结果=" + this.collision(0, 1));
        
        if (!this.collision(0, 1)) {
            this.undraw();
            this.y++;
            this.draw();
            console.log("moveDown: 向下移动成功，新位置 y=" + this.y);
            return true;
        }
        // 确保方块锁定在正确位置
        console.log("moveDown: 检测到碰撞，锁定方块");
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
        
        // 先擦除当前方块，避免残留
        this.undraw();
        
        this.shape = nextPattern;
        
        if (this.collision(0, 0)) {
            this.shape = originalShape; // 如果会碰撞，恢复原来的形状
            this.draw(); // 重新绘制原来的形状
        } else {
            // 直接绘制新形状，避免重复擦除导致的残留
            this.draw();
            if (soundEnabled) {
                rotateSound.play();
            }
        }
    }
    
    // 碰撞检测
    collision(x, y) {
        console.log("碰撞检测开始 - 参数: x=" + x + ", y=" + y);
        console.log("当前方块位置: this.x=" + this.x + ", this.y=" + this.y);
        console.log("方块形状: ", this.shape);
        
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (!this.shape[r][c]) {
                    continue; // 跳过方块形状中的空白部分
                }
                
                let newX = this.x + c + x;
                let newY = this.y + r + y;
                console.log("检查方块单元格: r=" + r + ", c=" + c + " => 新坐标: newX=" + newX + ", newY=" + newY);
                
                // 检查边界碰撞 - 确保方块可以到达底部
                if (newX < 0 || newX >= COLS || newY > ROWS - 1) {
                    console.log("边界碰撞! newX=" + newX + ", newY=" + newY + ", COLS=" + COLS + ", ROWS=" + ROWS);
                    return true;
                }
                
                // 跳过超出顶部的检查
                if (newY < 0) {
                    console.log("跳过顶部检查: newY=" + newY + " < 0");
                    continue;
                }
                
                // 检查与已有方块的碰撞
                if (board[newY][newX]) {
                    console.log("与已有方块碰撞! board[" + newY + "][" + newX + "] = " + board[newY][newX]);
                    return true;
                }
            }
        }
        console.log("无碰撞，返回false");
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
            
            // 重新绘制游戏板以显示消除效果
            drawBoard();
            
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
            // 如果游戏恢复，清除画布并重绘游戏
            if (!isPaused) {
                window.pauseScreenDrawn = false;
                // 清除整个画布
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // 重绘游戏板
                drawBoard();
                drawGrid();
                // 重绘当前方块
                currentPiece.draw();
            }
            break;
        case 77: // M键
            soundEnabled = !soundEnabled;
            break;
        case 81: // Q键
            gameOver = true;
            break;
    }
});

// 添加鼠标点击事件监听
canvas.addEventListener('click', function(e) {
    if (!isPaused) return; // 只在游戏暂停时响应点击
    
    // 获取点击坐标
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // 获取暂停菜单的位置和尺寸
    const pauseMenuWidth = 350;
    const pauseMenuHeight = 500;
    const pauseMenuX = canvas.width / 2 - pauseMenuWidth / 2;
    const pauseMenuY = canvas.height / 2 - pauseMenuHeight / 2;
    
    // 按钮尺寸和位置
    const btnWidth = 60;
    const btnHeight = 60;
    const btnSpacing = 25;
    const btnY = pauseMenuY + 280;
    
    // 继续游戏按钮区域
    const continueBtn = {
        x: pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2,
        y: btnY,
        width: btnWidth,
        height: btnHeight
    };
    
    // 重新开始按钮区域
    const restartBtn = {
        x: pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth + btnSpacing,
        y: btnY,
        width: btnWidth,
        height: btnHeight
    };
    
    // 结束游戏按钮区域
    const endBtn = {
        x: pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + 2 * (btnWidth + btnSpacing),
        y: btnY,
        width: btnWidth,
        height: btnHeight
    };
    
    // 检查点击是否在继续游戏按钮内
    if (clickX >= continueBtn.x && clickX <= continueBtn.x + continueBtn.width &&
        clickY >= continueBtn.y && clickY <= continueBtn.y + continueBtn.height) {
        // 继续游戏
        isPaused = false;
        window.pauseScreenDrawn = false;
        
        // 清除画布并重绘
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         drawBoard();
         drawGrid();
         p.draw();
    }
    
    // 检查点击是否在重新开始按钮内
    else if (clickX >= restartBtn.x && clickX <= restartBtn.x + restartBtn.width &&
             clickY >= restartBtn.y && clickY <= restartBtn.y + restartBtn.height) {
        // 重新开始游戏
        resetGame();
        isPaused = false;
        window.pauseScreenDrawn = false;
    }
    
    // 检查点击是否在结束游戏按钮内
     else if (clickX >= endBtn.x && clickX <= endBtn.x + endBtn.width &&
              clickY >= endBtn.y && clickY <= endBtn.y + endBtn.height) {
         // 结束游戏
         gameOver = true;
         isPaused = false;
         window.pauseScreenDrawn = false;
         
         // 显示游戏结束画面
         ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         
         ctx.fillStyle = 'white';
         ctx.font = '30px Arial';
         ctx.textAlign = 'center';
         ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
         ctx.font = '20px Arial';
         ctx.fillText('最终分数: ' + score, canvas.width / 2, canvas.height / 2 + 10);
         ctx.fillText('按F5刷新页面重新开始', canvas.width / 2, canvas.height / 2 + 50);
     }
});

// 游戏循环
function gameLoop() {
    // 更新游戏时间
    if (!gameOver && !isPaused && gameStartTime > 0) {
        gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    }
    
    if (gameOver) {
        // 计算游戏时间格式
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 绘制半透明黑色背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 游戏结束标题
        ctx.fillStyle = 'red';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 3 - 50);
        
        // 游戏信息面板
        const infoWidth = 200;
        const infoHeight = 200;
        const infoX = canvas.width / 2 - infoWidth / 2;
        const infoY = canvas.height / 3;
        
        // 绘制信息面板背景
        ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
        ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
        
        // 显示游戏信息
        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        
        // 最终分数
        ctx.fillText('最终分', infoX + 30, infoY + 40);
        ctx.fillText('数:', infoX + 30, infoY + 60);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'yellow';
        ctx.fillText(score, infoX + infoWidth - 30, infoY + 50);
        
        // 最高等级
        ctx.textAlign = 'left';
        ctx.fillStyle = 'white';
        ctx.fillText('最高等', infoX + 30, infoY + 90);
        ctx.fillText('级:', infoX + 30, infoY + 110);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'yellow';
        ctx.fillText(level, infoX + infoWidth - 30, infoY + 100);
        
        // 总清除行数
        ctx.textAlign = 'left';
        ctx.fillStyle = 'white';
        ctx.fillText('总清除', infoX + 30, infoY + 140);
        ctx.fillText('行:', infoX + 30, infoY + 160);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'yellow';
        ctx.fillText(lines, infoX + infoWidth - 30, infoY + 150);
        
        // 游戏时间
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.fillText('游戏时间:', canvas.width / 2, infoY + infoHeight + 20);
        ctx.fillStyle = 'yellow';
        ctx.fillText(timeFormatted, canvas.width / 2, infoY + infoHeight + 45);
        
        // 添加鼓励性文字
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText('不要气馁，每个高手都是从新手开始的！', canvas.width / 2, infoY + infoHeight + 80);
        
        // 重新开始按钮
        const btnWidth = 120;
        const btnHeight = 50;
        const btnX = canvas.width / 2 - btnWidth / 2;
        const btnY = infoY + infoHeight + 100;
        
        // 绘制按钮
        ctx.fillStyle = 'rgb(60, 179, 113)';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 15);
        ctx.fill();
        
        // 按钮文字
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('重新开始', canvas.width / 2, btnY + btnHeight / 2 + 6);
        
        // 添加按钮点击事件处理
        canvas.addEventListener('click', function gameOverClickHandler(e) {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            if (clickX >= btnX && clickX <= btnX + btnWidth &&
                clickY >= btnY && clickY <= btnY + btnHeight) {
                // 重新开始游戏
                resetGame();
                gameOver = false;
                gameStartTime = Date.now();
                // 移除事件监听器，避免重复添加
                canvas.removeEventListener('click', gameOverClickHandler);
            }
        });
        
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
        // 暂停状态 - 只在状态变化时绘制一次暂停界面
        if (!window.pauseScreenDrawn) {
            // 使用半透明覆盖层，保持底部方块可见
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 添加整体暂停页面背景
            const pauseMenuWidth = 350;
            const pauseMenuHeight = 500;
            const pauseMenuX = canvas.width / 2 - pauseMenuWidth / 2;
            const pauseMenuY = canvas.height / 2 - pauseMenuHeight / 2;
            
            // 绘制整体背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.beginPath();
            ctx.roundRect(pauseMenuX, pauseMenuY, pauseMenuWidth, pauseMenuHeight, 15);
            ctx.fill();
            
            // 添加暂停状态提示
            ctx.fillStyle = 'yellow';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('游戏暂停', canvas.width / 2, pauseMenuY + 50);
            
            // 添加游戏信息面板
            ctx.fillStyle = 'rgba(20, 20, 20, 0.8)';
            ctx.fillRect(pauseMenuX + 25, pauseMenuY + 80, pauseMenuWidth - 50, 120);
            
            // 显示游戏信息
            ctx.fillStyle = 'yellow';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('当前分数:', pauseMenuX + 50, pauseMenuY + 115);
            ctx.fillText('当前等级:', pauseMenuX + 50, pauseMenuY + 150);
            ctx.fillText('清除行数:', pauseMenuX + 50, pauseMenuY + 185);
            
            ctx.textAlign = 'right';
            ctx.fillText(score, pauseMenuX + pauseMenuWidth - 50, pauseMenuY + 115);
            ctx.fillText(level, pauseMenuX + pauseMenuWidth - 50, pauseMenuY + 150);
            ctx.fillText(lines, pauseMenuX + pauseMenuWidth - 50, pauseMenuY + 185);
            
            // 添加提示文本
            ctx.textAlign = 'center';
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('按空格键或点击"继续"按钮恢复游戏', canvas.width / 2, pauseMenuY + 230);
            
            // 绘制按钮
            const btnWidth = 60;
            const btnHeight = 60;
            const btnSpacing = 25;
            const btnY = pauseMenuY + 280;
            
            // 继续游戏按钮
            ctx.fillStyle = 'rgb(60, 179, 113)';
            ctx.beginPath();
            ctx.roundRect(pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2, btnY, btnWidth, btnHeight, 15);
            ctx.fill();
            
            // 重新开始按钮
            ctx.fillStyle = 'rgb(106, 90, 205)';
            ctx.beginPath();
            ctx.roundRect(pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth + btnSpacing, btnY, btnWidth, btnHeight, 15);
            ctx.fill();
            
            // 结束游戏按钮
            ctx.fillStyle = 'rgb(220, 20, 60)';
            ctx.beginPath();
            ctx.roundRect(pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + 2 * (btnWidth + btnSpacing), btnY, btnWidth, btnHeight, 15);
            ctx.fill();
            
            // 按钮文字
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            
            // 继续游戏按钮文字
            const btnTextY = btnY + btnHeight / 2;
            ctx.fillText('继续', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth / 2, btnTextY - 10);
            ctx.fillText('游戏', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth / 2, btnTextY + 15);
            
            // 重新开始按钮文字
            ctx.fillText('重新', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth + btnSpacing + btnWidth / 2, btnTextY - 10);
            ctx.fillText('开始', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + btnWidth + btnSpacing + btnWidth / 2, btnTextY + 15);
            
            // 结束游戏按钮文字
            ctx.fillText('结束', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + 2 * (btnWidth + btnSpacing) + btnWidth / 2, btnTextY - 10);
            ctx.fillText('游戏', pauseMenuX + (pauseMenuWidth - 3 * btnWidth - 2 * btnSpacing) / 2 + 2 * (btnWidth + btnSpacing) + btnWidth / 2, btnTextY + 15);
            
            window.pauseScreenDrawn = true;
        }
        
        // 当游戏恢复时重置标志
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 32 && isPaused) { // 空格键且当前为暂停状态
                window.pauseScreenDrawn = false;
            }
        }, { once: true });
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
    gameStartTime = Date.now();
    gameTime = 0;
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
    
    gameStartTime = Date.now();
    gameLoop();
}

// 启动游戏
window.onload = init;