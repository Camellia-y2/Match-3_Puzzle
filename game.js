// 难度与水果
const difficulties = {
    easy:   { moves: 20, target: 500 },
    medium: { moves: 20, target: 750 },
    hard:   { moves: 20, target: 1100 }
};
const FRUITS = {
    easy:   ['🍎', '🍌', '🍊', '🍇', '🍉'],
    medium: ['🍎', '🍌', '🍊', '🍇', '🍉', '🍓'],
    hard:   ['🍎', '🍌', '🍊', '🍇', '🍉', '🍓', '🥭', '🍍']
};

let gameState = {
    difficulty: null,
    score: 0,
    movesLeft: 0,
    targetScore: 0,
    selectedTile: null,
    board: [],
    size: 8,
    shuffling: false,
    toolUsed: { shuffle: false, addStep: false, undo: false },
    prevState: null // for undo
};
let gameIsOver = false;

// -------- 页面与流程 --------
function showDifficultyModal() {
    document.getElementById('difficultyModal').classList.add('active');
}
function closeDifficultyModal() {
    document.getElementById('difficultyModal').classList.remove('active');
}
function confirmExit() {
    document.getElementById('exitModal').classList.add('active');
}
function closeExitModal() {
    document.getElementById('exitModal').classList.remove('active');
}
function exitGame() {
    document.getElementById('exitModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
}

// 新增：游戏说明、关于我们模态框
function showHelpModal() {
    document.getElementById('helpModal').classList.add('active');
}
function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}
function showCreditsModal() {
    document.getElementById('creditsModal').classList.add('active');
}
function closeCreditsModal() {
    document.getElementById('creditsModal').classList.remove('active');
}

// ----------- 游戏主流程 ----------
function startGame(difficulty) {
    gameState.difficulty = difficulty;
    gameState.score = 0;
    gameState.movesLeft = difficulties[difficulty].moves;
    gameState.targetScore = difficulties[difficulty].target;
    gameState.selectedTile = null;
    gameIsOver = false;
    gameState.size = { easy: 6, medium: 8, hard: 10 }[difficulty];
    gameState.toolUsed = { shuffle: false, addStep: false, undo: false };
    gameState.prevState = null;

    closeDifficultyModal();
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('gameOverModal').classList.remove('active');
    generateBoard();
    updateUI();
    updateToolBtns();
}

// 生成棋盘（保证初始无三连）
function generateBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    gameState.board = [];
    const { size, difficulty } = gameState;
    const fruits = FRUITS[difficulty];

    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    let tiles = [];

    for(let i = 0; i < size * size; i++) {
        let fruit;
        do {
            fruit = fruits[Math.floor(Math.random() * fruits.length)];
        } while (
            (i % size >= 2 && fruit === tiles[i - 1] && fruit === tiles[i - 2]) ||
            (i >= size * 2 && fruit === tiles[i - size] && fruit === tiles[i - 2 * size])
        );
        tiles.push(fruit);
    }
    gameState.board = tiles;

    for(let i = 0; i < tiles.length; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile animate__animated';
        tile.dataset.index = i;
        tile.textContent = tiles[i];
        tile.addEventListener('click', onTileClick);
        boardEl.appendChild(tile);
            
    }
    
}

// 方块点击事件
function onTileClick(e) {
    if (gameState.shuffling || gameIsOver) return;
    const tileEl = e.currentTarget;
    const idx = parseInt(tileEl.dataset.index);
    const size = gameState.size;
    if (gameState.selectedTile === null) {
        tileEl.classList.add('selected');
        gameState.selectedTile = tileEl;
    } else if (gameState.selectedTile !== tileEl) {
        const firstIndex = parseInt(gameState.selectedTile.dataset.index);
        if (isAdjacent(firstIndex, idx, size)) {
            if (isValidSwap(firstIndex, idx, size)) {
                // 保存撤销状态
                savePrevState(firstIndex, idx);
                swapTiles(firstIndex, idx);
                playAudio('swap');
                gameState.movesLeft--;
                // 移除消耗分数的代码
                // gameState.score -= 10;
                updateUI();
                setTimeout(() => {
                    if (checkMatches()) {
                        setTimeout(() => {
                            fillEmptyTiles();
                        }, 320);
                    }
                    checkGameEnd();
                }, 200);
            } else {
                // 交换不合法，shake动画+音效
                tileEl.classList.add('shake');
                playAudio('invalid');
                setTimeout(() => tileEl.classList.remove('shake'), 350);
            }
        }
        gameState.selectedTile.classList.remove('selected');
        gameState.selectedTile = null;
    }
}

function savePrevState(i1, i2) {
    // 只保存撤销一次的快照
    gameState.prevState = {
        board: [...gameState.board],
        score: gameState.score,
        movesLeft: gameState.movesLeft,
        first: i1,
        second: i2
    };
}

// 判断相邻
function isAdjacent(a, b, size) {
    const rowA = Math.floor(a / size), colA = a % size;
    const rowB = Math.floor(b / size), colB = b % size;
    return (Math.abs(rowA - rowB) === 1 && colA === colB) ||
           (Math.abs(colA - colB) === 1 && rowA === rowB);
}

// 交换并更新DOM
function swapTiles(i1, i2) {
    [gameState.board[i1], gameState.board[i2]] = [gameState.board[i2], gameState.board[i1]];
    const tiles = document.getElementsByClassName('tile');
    tiles[i1].textContent = gameState.board[i1];
    tiles[i2].textContent = gameState.board[i2];
    tiles[i1].classList.add('animate__pulse');
    tiles[i2].classList.add('animate__pulse');
    setTimeout(() => {
        tiles[i1].classList.remove('animate__pulse');
        tiles[i2].classList.remove('animate__pulse');
    }, 350);
}

// 检查交换是否能消除
function isValidSwap(i1, i2, size) {
    [gameState.board[i1], gameState.board[i2]] = [gameState.board[i2], gameState.board[i1]];
    const valid = checkMatches(true);
    [gameState.board[i1], gameState.board[i2]] = [gameState.board[i2], gameState.board[i1]];
    return valid;
}

// 检查消除，只检测直线
function checkMatches(isPreview = false) {
    const { board, size } = gameState;
    let matches = new Set();
    // 横向
    for(let row = 0; row < size; row++) {
        let count = 1;
        for(let col = 1; col < size; col++) {
            const cur = row * size + col;
            const prev = row * size + (col - 1);
            if (board[cur] && board[cur] === board[prev]) {
                count++;
                if (count >= 3 && col === size - 1) {
                    for (let k = 0; k < count; k++) matches.add(cur - k);
                }
            } else {
                if (count >= 3) for (let k = 1; k <= count; k++) matches.add(prev - (k - 1));
                count = 1;
            }
        }
    }
    // 纵向
    for(let col = 0; col < size; col++) {
        let count = 1;
        for(let row = 1; row < size; row++) {
            const cur = row * size + col;
            const prev = (row - 1) * size + col;
            if (board[cur] && board[cur] === board[prev]) {
                count++;
                if (count >= 3 && row === size - 1) {
                    for (let k = 0; k < count; k++) matches.add(cur - k * size);
                }
            } else {
                if (count >= 3) for (let k = 1; k <= count; k++) matches.add(prev - (k - 1) * size);
                count = 1;
            }
        }
    }
    if (!isPreview && matches.size > 0) {
        // 消除动画
        const tiles = document.getElementsByClassName('tile');
        matches.forEach(idx => {
            board[idx] = null;
            tiles[idx].textContent = '';
            tiles[idx].classList.add('eliminate');
        });
        playAudio('eliminate');
        setTimeout(() => {
            matches.forEach(idx => tiles[idx].classList.remove('eliminate'));
        }, 400);
        calculateScore(matches.size);
    }
    return matches.size > 0;
}

// 得分
function calculateScore(cnt) {
    if (cnt >= 3) gameState.score += 20 * (cnt - 2);
    updateUI();
    checkGameEnd(); // 立刻判断胜负
}

// 下落补齐
function fillEmptyTiles() {
    const { board, size, difficulty } = gameState;
    const tiles = document.getElementsByClassName('tile');
    for(let col = 0; col < size; col++) {
        let write = size - 1;
        for(let row = size - 1; row >= 0; row--) {
            let idx = row * size + col;
            if (board[idx] !== null) {
                board[write * size + col] = board[idx];
                if (write !== row) {
                    board[idx] = null;
                    tiles[idx].textContent = '';
                    tiles[write * size + col].textContent = board[write * size + col];
                }
                write--;
            }
        }
        // 顶部补新
        for(let row = write; row >= 0; row--) {
            let idx = row * size + col;
            board[idx] = getRandomFruit(difficulty);
            tiles[idx].textContent = board[idx];
            tiles[idx].classList.add('animate__fadeInDown');
            setTimeout(() => tiles[idx].classList.remove('animate__fadeInDown'), 300);
        }
    }
    setTimeout(() => {
        if (checkMatches()) {
            setTimeout(fillEmptyTiles, 350);
        }
    }, 370);
}

// 随机水果
function getRandomFruit(difficulty) {
    const arr = FRUITS[difficulty];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 音效
function playAudio(type) {
    let audio;
    if (type === 'swap') audio = document.getElementById('swapSound');
    if (type === 'eliminate') audio = document.getElementById('eliminateSound');
    if (type === 'invalid') audio = document.getElementById('invalidSound');
    if (type === 'win') audio = document.getElementById('winSound');
    if (type === 'lose') audio = document.getElementById('loseSound');
    if (audio) { audio.currentTime = 0; audio.play(); }
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('moves').textContent = gameState.movesLeft;
    document.getElementById('target').textContent = gameState.targetScore;
    // 更新进度条
    const progressBar = document.getElementById('scoreProgress');
    if (progressBar) {
        let percent = 0;
        if (gameState.targetScore > 0) {
            percent = Math.min((gameState.score / gameState.targetScore) * 100, 100);
        }
        progressBar.style.width = percent + "%";
    }
    updateToolBtns();
}

// 检查游戏结束
function checkGameEnd() {
    if (gameIsOver) return;
    if (gameState.score >= gameState.targetScore) {
        showGameOverModal(true);
        gameIsOver = true;
        gameState.movesLeft = 0;
        disableBoard();
    } else if (gameState.movesLeft <= 0) {
        showGameOverModal(false);
        gameIsOver = true;
        disableBoard();
    }
}

// 禁用棋盘
function disableBoard() {
    const tiles = document.getElementsByClassName('tile');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].onclick = null;
        tiles[i].style.pointerEvents = 'none';
    }
}

// 游戏结束模态框
function showGameOverModal(isWin) {
    if (isWin) {
        playAudio('win');
    } else {
        playAudio('lose');
    }
    const modal = document.getElementById('gameOverModal');
    const content = document.getElementById('gameOverContent');
    content.innerHTML = `
        <h2 style="color:${isWin ? '#2ecc71':'#e84a5f'}">${isWin ? '🎉 游戏胜利！' : '😢 游戏失败！'}</h2>
        <p>最终得分: <b>${gameState.score}</b></p>
        <p>目标分数: <b>${gameState.targetScore}</b></p>
        <button class="cute-btn" onclick="exitGame()">确认</button>
    `;
    modal.classList.add('active');
}

// ------------ 道具实现 ---------------

function updateToolBtns() {
    document.getElementById('shuffleCount').innerHTML = `<span class="tool-count-bg" style="background:#e84a5f;">${gameState.toolUsed.shuffle? '0':'1'}</span>`;
    document.getElementById('addStepCount').innerHTML = `<span class="tool-count-bg" style="background:#e84a5f;">${gameState.toolUsed.addStep? '0':'1'}</span>`;
    document.getElementById('undoCount').innerHTML = `<span class="tool-count-bg" style="background:#e84a5f;">${gameState.toolUsed.undo? '0':'1'}</span>`;

    document.getElementById('shuffleBtn').disabled = gameState.toolUsed.shuffle || gameIsOver || gameState.score < 50;
    document.getElementById('addStepBtn').disabled = gameState.toolUsed.addStep || gameIsOver || gameState.score < 70;
    // 撤销不再扣分，所以无分数判断
    document.getElementById('undoBtn').disabled = gameState.toolUsed.undo || gameIsOver || !gameState.prevState;

    const tip = document.getElementById('shuffleTip');
    if (tip) tip.textContent = '';
}

// 打乱道具
function shuffleBoard() {
    if (gameState.shuffling || gameIsOver || gameState.toolUsed.shuffle) return;
    if (gameState.score < 50) {
        showToolTip('分数不足，无法打乱！');
        return;
    }
    gameState.toolUsed.shuffle = true;
    let arr = gameState.board.filter(x=>x);
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    for(let i=0;i<arr.length;i++) gameState.board[i]=arr[i];
    const tiles = document.getElementsByClassName('tile');
    for(let i=0;i<arr.length;i++) {
        tiles[i].textContent = arr[i];
        tiles[i].classList.add('animate__flash');
        setTimeout(() => tiles[i].classList.remove('animate__flash'), 400);
    }
    gameState.score -= 50;
    if (gameState.score < 0) gameState.score = 0;
    updateUI();
    setTimeout(()=>{
        if (checkMatches()) {
            setTimeout(fillEmptyTiles, 360);
        }
        gameState.shuffling = false;
        updateToolBtns();
    }, 400);
}

// 加步数道具
function addStep() {
    if (gameState.toolUsed.addStep || gameIsOver) return;
    if (gameState.score < 70) {
        showToolTip('分数不足，无法加步！');
        return;
    }
    gameState.toolUsed.addStep = true;
    gameState.score -= 70;
    if (gameState.score < 0) gameState.score = 0;
    gameState.movesLeft += 3;
    playAudio('swap');
    updateUI();
    showToolTip('已增加3步');
    setTimeout(updateToolBtns, 1600);
}

// 撤销道具，不扣分
function undoMove() {
    if (gameState.toolUsed.undo || gameIsOver) return;
    if (!gameState.prevState) {
        showToolTip('暂无可撤销的操作');
        return;
    }
    // 不再扣分
    gameState.toolUsed.undo = true;

    gameState.board = [...gameState.prevState.board];
    gameState.score = gameState.prevState.score;
    gameState.movesLeft = gameState.prevState.movesLeft;

    const tiles = document.getElementsByClassName('tile');
    for(let i=0;i<gameState.board.length;i++) {
        tiles[i].textContent = gameState.board[i];
    }
    playAudio('swap');
    updateUI();
    showToolTip('已撤销上一步并加1步');
    setTimeout(updateToolBtns, 1600);
}

function showToolTip(msg) {
    const tip = document.getElementById('shuffleTip');
    if (!tip) return;
    tip.textContent = msg;
    tip.style.color = "#e84a5f";
    setTimeout(() => {
        tip.style.color = "#ff8b6a";
        updateToolBtns();
    }, 1800);
}
function showToolTip(msg) {
    const modal = document.getElementById('toolTipModal');
    const msgSpan = document.getElementById('toolTipModalMsg');
    if (!modal || !msgSpan) return;
    msgSpan.textContent = msg;
    modal.classList.add('active');
    setTimeout(() => {
        modal.classList.remove('active');
        updateToolBtns();
    }, 1000); // 1秒后关闭
}

// 难度对应参数
const size = 6; // 6x6、8x8、10x10等
const tileSize = 52; // 或你想要的格子像素

const board = document.getElementById('board');
board.style.setProperty('--board-size', size);
board.style.setProperty('--tile-size', tileSize + 'px');