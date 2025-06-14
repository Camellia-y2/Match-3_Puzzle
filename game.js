// 难度与水果
const difficulties = {
    easy:   { moves: 20, target: 500 },
    medium: { moves: 20, target: 750 },
    hard:   { moves: 20, target: 1100 }
};
const FRUITS = {
    easy:   ['🍎', '🍌', '🍒', '🍇', '🍉', '🥑'],
    medium: ['🍎', '🍌', '🍒', '🍇', '🍉', '🥑' , '🍓','🥥'],
    hard:   ['🍎', '🍌', '🍒', '🍇', '🍉','🥑', '🍓','🥝','🥥', '🍊', '🍈']
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

// 新增全局变量，避免重复打乱
let shufflePending = false;

// 音效播放函数升级
function playAudio(type, extra) {
    let audio;
    if (type === 'start') audio = document.getElementById('startSound');
    if (type === 'swap') audio = document.getElementById('swapSound');
    if (type === 'eliminate') {
        // extra: 匹配数
        if (extra >= 4) audio = document.getElementById('eliminate45Sound');
        else audio = document.getElementById('eliminate3Sound');
    }
    if (type === 'tool') audio = document.getElementById('toolSound');
    if (type === 'win') audio = document.getElementById('winSound');
    if (type === 'lose') audio = document.getElementById('loseSound');
    if (type === 'click') audio = document.getElementById('clickSound');
    if (type === 'invalid') audio = document.getElementById('eliminate3Sound');
    if (type === 'shuffleBoard') audio = document.getElementById('shuffleBoardSound');
    if (audio) { audio.currentTime = 0; audio.play(); }
}

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
    gameState.size = { easy: 6, medium: 8, hard: 9 }[difficulty];
    gameState.toolUsed = { shuffle: false, addStep: false, undo: false };
    gameState.prevState = null;

    closeDifficultyModal();
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('gameOverModal').classList.remove('active');
    generateBoard();
    updateUI();
    updateToolBtns();
    resetInactivityTimer();
    playAudio('start');
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
    clearHintTiles();
    if (gameState.shuffling || gameIsOver || shufflePending) return;
    const tileEl = e.currentTarget;
    const idx = parseInt(tileEl.dataset.index);
    const size = gameState.size;
    playAudio('click');
    if (gameState.selectedTile === null) {
        tileEl.classList.add('selected');
        gameState.selectedTile = tileEl;
    } else if (gameState.selectedTile !== tileEl) {
        const firstIndex = parseInt(gameState.selectedTile.dataset.index);
        if (isAdjacent(firstIndex, idx, size)) {
            if (isValidSwap(firstIndex, idx, size)) {
                savePrevState(firstIndex, idx);
                swapTiles(firstIndex, idx);
                playAudio('swap');
                gameState.movesLeft--;
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
                tileEl.classList.add('shake');
                playAudio('invalid');
                setTimeout(() => tileEl.classList.remove('shake'), 350);
            }
        }
        gameState.selectedTile.classList.remove('selected');
        gameState.selectedTile = null;
    }
    resetInactivityTimer();
}

function savePrevState(i1, i2) {
    gameState.prevState = {
        board: [...gameState.board],
        score: gameState.score,
        movesLeft: gameState.movesLeft,
        first: i1,
        second: i2
    };
}

function isAdjacent(a, b, size) {
    const rowA = Math.floor(a / size), colA = a % size;
    const rowB = Math.floor(b / size), colB = b % size;
    return (Math.abs(rowA - rowB) === 1 && colA === colB) ||
           (Math.abs(colA - colB) === 1 && rowA === rowB);
}
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
    resetInactivityTimer();
}
function isValidSwap(i1, i2, size) {
    [gameState.board[i1], gameState.board[i2]] = [gameState.board[i2], gameState.board[i1]];
    const valid = checkMatches(true);
    [gameState.board[i1], gameState.board[i2]] = [gameState.board[i2], gameState.board[i1]];
    return valid;
}

// --- 五连“十字消除”实现 ---
function createFiveLineTile(idx, fruit) {
    const tiles = document.getElementsByClassName('tile');
    tiles[idx].classList.add('five-line-tile');
    setTimeout(() => {
        tiles[idx].classList.remove('five-line-tile');
    }, 450);
}

function checkMatches(isPreview = false) {
    const { board, size } = gameState;
    let matches = new Set();
    let rowSpecial = new Set();
    let colSpecial = new Set();
    let fiveLineSpecial = [];
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
                if (!isPreview && count === 4) rowSpecial.add(row * size + col - 2);
                if (!isPreview && count >= 5) {
                    let mid = row * size + col - Math.floor(count/2);
                    fiveLineSpecial.push(mid);
                }
                count = 1;
            }
        }
        if (!isPreview && count === 4) rowSpecial.add(row * size + size - 2);
        if (!isPreview && count >= 5) {
            let mid = row * size + size - Math.floor(count/2) - 1;
            fiveLineSpecial.push(mid);
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
                if (!isPreview && count === 4) colSpecial.add((row - 2) * size + col);
                if (!isPreview && count >= 5) {
                    let mid = (row - Math.floor(count/2)) * size + col;
                    fiveLineSpecial.push(mid);
                }
                count = 1;
            }
        }
        if (!isPreview && count === 4) colSpecial.add((size - 2) * size + col);
        if (!isPreview && count >= 5) {
            let mid = (size - Math.floor(count/2) - 1) * size + col;
            fiveLineSpecial.push(mid);
        }
    }
    // 四连：整行/整列全消
    if (!isPreview && (rowSpecial.size > 0 || colSpecial.size > 0)) {
        let fullLine = new Set();
        for(const idx of rowSpecial) {
            let row = Math.floor(idx / size);
            for(let col=0; col<size; col++) fullLine.add(row * size + col);
        }
        for(const idx of colSpecial) {
            let col = idx % size;
            for(let row=0; row<size; row++) fullLine.add(row * size + col);
        }
        fullLine.forEach(idx => matches.add(idx));
        showLineEffect && showLineEffect([...rowSpecial], [...colSpecial]);
    }
    // 五连：以最中间那个点的行列全部消除
    if (!isPreview && fiveLineSpecial.length > 0) {
        let fullCross = new Set();
        for(const idx of fiveLineSpecial) {
            let row = Math.floor(idx / size);
            let col = idx % size;
            for(let c=0; c<size; c++) fullCross.add(row * size + c);
            for(let r=0; r<size; r++) fullCross.add(r * size + col);
            createFiveLineTile(idx, board[idx]);
        }
        fullCross.forEach(idx => matches.add(idx));
        showLineEffect && showLineEffect(fiveLineSpecial, fiveLineSpecial);
    }
    if (!isPreview && matches.size > 0) {
        const tiles = document.getElementsByClassName('tile');
        let matchCount = matches.size;
        playAudio('eliminate', matchCount);
        matches.forEach(idx => {
            board[idx] = null;
            tiles[idx].textContent = '';
            tiles[idx].classList.add('eliminate');
        });
        setTimeout(() => {
            matches.forEach(idx => {
                tiles[idx].classList.remove('eliminate');
            });
        }, 400);
        calculateScore && calculateScore(matches.size);
    }
    return matches.size > 0 || (!isPreview && fiveLineSpecial.length > 0);
}

function showLineEffect(rowSpecialArr, colSpecialArr) {
    const tiles = document.getElementsByClassName('tile');
    for(const idx of rowSpecialArr) {
        let row = Math.floor(idx / gameState.size);
        for(let col=0; col<gameState.size; col++) {
            let i = row * gameState.size + col;
            tiles[i].classList.add('line-effect');
            setTimeout(() => tiles[i].classList.remove('line-effect'), 450);
        }
    }
    for(const idx of colSpecialArr) {
        let col = idx % gameState.size;
        for(let row=0; row<gameState.size; row++) {
            let i = row * gameState.size + col;
            tiles[i].classList.add('col-effect');
            setTimeout(() => tiles[i].classList.remove('col-effect'), 450);
        }
    }
}

function calculateScore(cnt) {
    if (cnt >= 3) gameState.score += 20 * (cnt - 2);
    updateUI();
    checkGameEnd();
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
    setTimeout(() => {
        if (!gameIsOver) {
            checkNoPossibleMove();
        }
    }, 400);
    resetInactivityTimer();
}

function getRandomFruit(difficulty) {
    const arr = FRUITS[difficulty];
    return arr[Math.floor(Math.random() * arr.length)];
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('moves').textContent = gameState.movesLeft;
    document.getElementById('target').textContent = gameState.targetScore;
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
function disableBoard() {
    const tiles = document.getElementsByClassName('tile');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].onclick = null;
        tiles[i].style.pointerEvents = 'none';
    }
}
function disableBoardTemp() {
    const tiles = document.getElementsByClassName('tile');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].style.pointerEvents = 'none';
    }
}
function enableBoardTemp() {
    const tiles = document.getElementsByClassName('tile');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].style.pointerEvents = '';
    }
}
function showGameOverModal(isWin) {
    if (isWin) playAudio('win');
    else playAudio('lose');
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
    document.getElementById('undoBtn').disabled = gameState.toolUsed.undo || gameIsOver || !gameState.prevState;
    const tip = document.getElementById('shuffleTip');
    if (tip) tip.textContent = '';
}
// 打乱道具
function shuffleBoard() {
    if (gameState.shuffling || gameIsOver || gameState.toolUsed.shuffle || shufflePending) return;
    if (gameState.score < 50) {
        showToolTip('分数不足，无法打乱！');
        return;
    }
    gameState.toolUsed.shuffle = true;
    playAudio('shuffleBoard');
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
    playAudio('tool');
    updateUI();
    showToolTip('已增加3步');
    setTimeout(updateToolBtns, 1600);
}
function undoMove() {
    if (gameState.toolUsed.undo || gameIsOver) return;
    if (!gameState.prevState) {
        showToolTip('暂无可撤销的操作');
        return;
    }
    gameState.toolUsed.undo = true;
    gameState.board = [...gameState.prevState.board];
    gameState.score = gameState.prevState.score;
    gameState.movesLeft = gameState.prevState.movesLeft;
    const tiles = document.getElementsByClassName('tile');
    for(let i=0;i<gameState.board.length;i++) {
        tiles[i].textContent = gameState.board[i];
    }
    playAudio('tool');
    updateUI();
    showToolTip('已撤销上一步并加1步');
    setTimeout(updateToolBtns, 1600);
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
    }, 1000);
}

// ===== 自动提示&无解检测 =====
let inactivityTimer = null;
let hintTiles = [];
let hintActive = false;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (!gameIsOver && document.getElementById('gameScreen').classList.contains('active') && !hintActive) {
        inactivityTimer = setTimeout(showHintIfPossible, 5000);
    }
}
function showHintIfPossible() {
    let hint = findHint(gameState.board, gameState.size, gameState.difficulty);
    if (hint && hint.length === 2) {
        hintTiles = hint;
        const tiles = document.getElementsByClassName('tile');
        tiles[hint[0]].classList.add('selected');
        tiles[hint[1]].classList.add('selected');
        hintActive = true;
    }
}
function clearHintTiles() {
    if (hintTiles.length) {
        const tiles = document.getElementsByClassName('tile');
        hintTiles.forEach(idx => tiles[idx] && tiles[idx].classList.remove('selected'));
        hintTiles = [];
    }
    hintActive = false;
}
function findHint(board, size, difficulty) {
    for (let i = 0; i < board.length; i++) {
        const row = Math.floor(i / size), col = i % size;
        const dirs = [[0, 1], [1, 0]];
        for (let [dr, dc] of dirs) {
            let nr = row + dr, nc = col + dc;
            if (nr < size && nc < size) {
                let ni = nr * size + nc;
                [board[i], board[ni]] = [board[ni], board[i]];
                if (checkMatchPreview(board, size)) {
                    [board[i], board[ni]] = [board[ni], board[i]];
                    return [i, ni];
                }
                [board[i], board[ni]] = [board[ni], board[i]];
            }
        }
    }
    return null;
}
function checkMatchPreview(board, size) {
    for (let row = 0; row < size; row++) {
        let count = 1;
        for (let col = 1; col < size; col++) {
            let cur = row * size + col;
            let prev = row * size + (col - 1);
            if (board[cur] && board[cur] === board[prev]) {
                count++;
                if (count >= 3 && col === size - 1) return true;
            } else {
                if (count >= 3) return true;
                count = 1;
            }
        }
    }
    for (let col = 0; col < size; col++) {
        let count = 1;
        for (let row = 1; row < size; row++) {
            let cur = row * size + col;
            let prev = (row - 1) * size + col;
            if (board[cur] && board[cur] === board[prev]) {
                count++;
                if (count >= 3 && row === size - 1) return true;
            } else {
                if (count >= 3) return true;
                count = 1;
            }
        }
    }
    return false;
}
function checkNoPossibleMove() {
    if (shufflePending || gameIsOver) return;
    if (!findHint(gameState.board, gameState.size, gameState.difficulty)) {
        shufflePending = true;
        disableBoardTemp();
        showToolTip('无可消除水果，重新打乱');
        setTimeout(() => {
            doBoardShuffleAnimation();
            setTimeout(() => {
                performAutoShuffle();
                if (!findHint(gameState.board, gameState.size, gameState.difficulty)) {
                    setTimeout(checkNoPossibleMove, 500);
                } else {
                    shufflePending = false;
                    enableBoardTemp();
                }
            }, 600);
        }, 1100);
    }
}
function doBoardShuffleAnimation() {
    const tiles = document.getElementsByClassName('tile');
    playAudio('shuffleBoard');
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add('shuffle-anim');
    }
    setTimeout(() => {
        for (let i = 0; i < tiles.length; i++) {
            tiles[i].classList.remove('shuffle-anim');
        }
    }, 600);
}
function performAutoShuffle() {
    let arr = gameState.board.filter(x => x);
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    for (let i = 0; i < arr.length; i++) gameState.board[i] = arr[i];
    const tiles = document.getElementsByClassName('tile');
    for (let i = 0; i < arr.length; i++) {
        tiles[i].textContent = arr[i];
        tiles[i].classList.add('animate__flash');
        setTimeout(() => tiles[i].classList.remove('animate__flash'), 400);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen) {
        gameScreen.addEventListener('mousedown', resetInactivityTimer, true);
        gameScreen.addEventListener('touchstart', resetInactivityTimer, true);
    }
});
['mousedown', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
});

// ======= 粒子背景与渐变背景略，省略不变 =====

// ======= 粒子背景 =======
(function () {
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-bg-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 0;
    document.body.appendChild(canvas);

    let ctx = canvas.getContext('2d');
    let w = window.innerWidth, h = window.innerHeight;

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
    }
    window.addEventListener('resize', resize);
    resize();

    const COLORS = ['#fffbe0', '#ffd6e0', '#b8ceff', '#ffe3a3', '#A1FFE3'];
    const PARTICLE_NUM = 48;
    const particles = [];
    for (let i = 0; i < PARTICLE_NUM; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: 0.4 + Math.random() * 0.5,
            vy: -0.1 + Math.random() * 0.2,
            r: 1.8 + Math.random() * 2.8,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: 0.15 + Math.random() * 0.15
        });
    }
    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < PARTICLE_NUM; i++) {
            const p = particles[i];
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            if (p.x > w + 30) p.x = -10, p.y = Math.random() * h;
            if (p.y < -20 || p.y > h + 20) p.y = Math.random() * h;
        }
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < PARTICLE_NUM; i++) {
            for (let j = i + 1; j < PARTICLE_NUM; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let dist = dx * dx + dy * dy;
                if (dist < 3800) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = '#ffadc2';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    animate();
})();

// ========== 柔和渐变动态背景 ==========
(function softGradientBG() {
    const canvas = document.createElement('canvas');
    canvas.id = 'soft-gradient-bg';
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 0;
    document.body.appendChild(canvas);

    let ctx = canvas.getContext('2d');
    let w = window.innerWidth, h = window.innerHeight;

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
    }
    window.addEventListener('resize', resize);
    resize();

    const bubbleNum = 7;
    const bubbles = [];
    const palette = [
        ['#ffe3ee', '#ffe3a3'],
        ['#b8ceff', '#f3ffe2'],
        ['#ffd6e0', '#fffbe0'],
        ['#fffbe0', '#A1FFE3'],
        ['#ffd6e0', '#b8ceff'],
        ['#f3ffe2', '#ffb8d1'],
        ['#fffbe0', '#b8ceff']
    ];
    for (let i = 0; i < bubbleNum; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 0.12 + Math.random() * 0.09;
        let r = 180 + Math.random() * 120;
        let colorIdx = Math.floor(Math.random() * palette.length);
        bubbles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            color1: palette[colorIdx][0],
            color2: palette[colorIdx][1],
            alpha: 0.14 + Math.random() * 0.11,
            phase: Math.random() * Math.PI * 2
        });
    }
    function animate() {
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < bubbleNum; i++) {
            const b = bubbles[i];
            b.x += b.dx * (1.1 + Math.sin(Date.now()/4200 + b.phase) * 0.14);
            b.y += b.dy * (1.1 + Math.cos(Date.now()/3000 + b.phase) * 0.1);
            if (b.x < -b.r) b.x = w + b.r * 0.5;
            if (b.x > w + b.r) b.x = -b.r * 0.5;
            if (b.y < -b.r) b.y = h + b.r * 0.5;
            if (b.y > h + b.r) b.y = -b.r * 0.5;
            let grad = ctx.createRadialGradient(
                b.x, b.y, b.r*0.38, b.x, b.y, b.r
            );
            grad.addColorStop(0, b.color1);
            grad.addColorStop(1, b.color2);
            ctx.globalAlpha = b.alpha;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        requestAnimationFrame(animate);
    }
    animate();
})();
