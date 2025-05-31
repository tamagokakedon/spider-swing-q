// ゲームの設定
const config = {
    width: 800,
    height: 600,
    gravity: 0.5,
    scrollSpeed: 3,
    initialPlatformWidth: 400, // 初期の足場を長くする
    playerSize: 30,
    minObstacleDistance: 100,
    maxObstacleDistance: 300,
    minObstacleHeight: 50,
    maxObstacleHeight: 150,
    minObstacleWidth: 100, // 最小障害物幅を増加
    maxObstacleWidth: 250, // 最大障害物幅を増加
    ceilingHeight: 50
};

// ゲームの状態
const gameState = {
    running: false,
    score: 0,
    player: {
        x: 100,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        swinging: false
    },
    web: {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        length: 0,
        initialLength: 0  // 糸を付着した時点での初期の長さを保存
    },
    obstacles: [],
    keys: {
        up: false,
        down: false
    }
};

// DOM要素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('score');
const finalScore = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// キャンバスのサイズ設定
canvas.width = config.width;
canvas.height = config.height;

// ゲームの初期化
function initGame() {
    gameState.running = false;
    gameState.score = 0;
    
    // 初期の足場を作成
    gameState.obstacles = [];
    const initialObstacle = {
        x: 50, // 少し右に移動して、プレイヤーが画面外に出ないようにする
        y: config.height - 30,
        width: config.initialPlatformWidth,
        height: 30
    };
    gameState.obstacles.push(initialObstacle);
    
    // プレイヤーの初期位置を障害物の上に正確に設定
    // 障害物の上部（y - height）にプレイヤーの底部を合わせる
    gameState.player = {
        x: 100,
        y: (initialObstacle.y - initialObstacle.height) - config.playerSize / 2,
        velocityX: 0,
        velocityY: 0,
        onGround: true,
        swinging: false
    };
    
    gameState.web = {
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        length: 0,
        initialLength: 0
    };
    
    // キーの状態をリセット
    gameState.keys.up = false;
    gameState.keys.down = false;
    
    // 障害物を生成
    generateObstacles();
    
    // スコア表示を更新
    updateScore(0);
    
    // スタート画面を表示
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    console.log("初期化完了: プレイヤー位置", gameState.player.y, "障害物上部", initialObstacle.y - initialObstacle.height);
}

// 障害物の生成
function generateObstacles() {
    let lastX = config.initialPlatformWidth;
    
    // 画面を埋めるまで障害物を生成
    while (lastX < config.width * 3) {
        const width = Math.random() * (config.maxObstacleWidth - config.minObstacleWidth) + config.minObstacleWidth;
        const height = Math.random() * (config.maxObstacleHeight - config.minObstacleHeight) + config.minObstacleHeight;
        const gap = Math.random() * (config.maxObstacleDistance - config.minObstacleDistance) + config.minObstacleDistance;
        
        lastX += gap;
        
        // 障害物の位置を設定（y座標は底部の位置）
        gameState.obstacles.push({
            x: lastX,
            y: config.height - height,
            width: width,
            height: height
        });
        
        lastX += width;
    }
    
    // デバッグ用：最初の数個の障害物の位置を出力
    console.log("障害物配置:", gameState.obstacles.slice(0, 3).map(o => 
        `x:${o.x}, y:${o.y}, 上部:${o.y - o.height}, 幅:${o.width}, 高さ:${o.height}`));
}

// 新しい障害物の追加
function addNewObstacle() {
    const lastObstacle = gameState.obstacles[gameState.obstacles.length - 1];
    const width = Math.random() * (config.maxObstacleWidth - config.minObstacleWidth) + config.minObstacleWidth;
    const height = Math.random() * (config.maxObstacleHeight - config.minObstacleHeight) + config.minObstacleHeight;
    const gap = Math.random() * (config.maxObstacleDistance - config.minObstacleDistance) + config.minObstacleDistance;
    
    gameState.obstacles.push({
        x: lastObstacle.x + lastObstacle.width + gap,
        y: config.height - height,
        width: width,
        height: height
    });
}

// ゲームの更新
function update() {
    if (!gameState.running) return;
    
    // スコアの更新
    gameState.score++;
    updateScore(gameState.score);
    
// 障害物のスクロール
for (let i = 0; i < gameState.obstacles.length; i++) {
    gameState.obstacles[i].x -= config.scrollSpeed;
}

// 糸の設置点もスクロールさせる
if (gameState.web.active) {
    gameState.web.endX -= config.scrollSpeed;
}
    
    // 画面外に出た障害物を削除
    if (gameState.obstacles.length > 0 && gameState.obstacles[0].x + gameState.obstacles[0].width < 0) {
        gameState.obstacles.shift();
        addNewObstacle();
    }
    
    // キーの状態をデバッグ出力
    if (gameState.web.active) {
        console.log(`キー状態: 上=${gameState.keys.up}, 下=${gameState.keys.down}`);
    }
    
    // プレイヤーの物理演算
    updatePlayerPhysics();
    
    // 衝突判定
    checkCollisions();
    
    // ゲームオーバー判定
    checkGameOver();
}

// プレイヤーの物理演算
function updatePlayerPhysics() {
    // ゲームが開始されていない場合は物理演算を適用しない
    if (!gameState.running) return;
    
    // 重力の適用
    if (!gameState.player.onGround && !gameState.web.active) {
        gameState.player.velocityY += config.gravity;
    }
    
    // スイング中の場合
    if (gameState.web.active) {
        updateSwing();
    }
    
    // 位置の更新（前の位置を保存）
    const prevX = gameState.player.x;
    const prevY = gameState.player.y;
    
    // プレイヤーのX位置は固定し、代わりに障害物と糸の設置点を移動させる
    const playerXMovement = gameState.player.velocityX;
    if (playerXMovement !== 0) {
        // 障害物を移動
        for (let i = 0; i < gameState.obstacles.length; i++) {
            gameState.obstacles[i].x -= playerXMovement;
        }
        
        // 糸の設置点を移動
        if (gameState.web.active) {
            gameState.web.endX -= playerXMovement;
        }
        
        // プレイヤーのX速度をリセット
        gameState.player.velocityX = 0;
    }
    
    // Y方向の移動のみ適用
    gameState.player.y += gameState.player.velocityY;
    
    // 地面との衝突判定
    gameState.player.onGround = false;
    
    // 障害物との衝突判定
    for (const obstacle of gameState.obstacles) {
        // プレイヤーの底部と障害物の上部の衝突判定
        const playerBottom = gameState.player.y + config.playerSize / 2;
        const obstacleTop = obstacle.y - obstacle.height;
        
        // プレイヤーが障害物の上にいるかチェック
        if (gameState.player.x + config.playerSize / 2 > obstacle.x && 
            gameState.player.x - config.playerSize / 2 < obstacle.x + obstacle.width) {
            
            // 上からの衝突（着地）- 障害物の上部に着地
            if (prevY + config.playerSize / 2 <= obstacleTop && 
                playerBottom >= obstacleTop && 
                gameState.player.velocityY >= 0) {
                
                gameState.player.y = obstacleTop - config.playerSize / 2;
                gameState.player.velocityY = 0;
                gameState.player.onGround = true;
                break;
            }
            
            // 下からの衝突（天井）
            if (prevY - config.playerSize / 2 >= obstacleTop && 
                gameState.player.y - config.playerSize / 2 <= obstacleTop && 
                gameState.player.velocityY < 0) {
                
                gameState.player.y = obstacleTop + config.playerSize / 2;
                gameState.player.velocityY = 0;
                break;
            }
        }
        
        // 左右からの衝突（側面）
        if (gameState.player.y + config.playerSize / 2 > obstacleTop && 
            gameState.player.y - config.playerSize / 2 < obstacle.y) {
            
            // 右からの衝突
            if (prevX - config.playerSize / 2 >= obstacle.x + obstacle.width && 
                gameState.player.x - config.playerSize / 2 <= obstacle.x + obstacle.width) {
                
                gameState.player.x = obstacle.x + obstacle.width + config.playerSize / 2;
                gameState.player.velocityX = 0;
                break;
            }
            
            // 左からの衝突
            if (prevX + config.playerSize / 2 <= obstacle.x && 
                gameState.player.x + config.playerSize / 2 >= obstacle.x) {
                
                gameState.player.x = obstacle.x - config.playerSize / 2;
                gameState.player.velocityX = 0;
                break;
            }
        }
    }
    
    // 天井との衝突判定
    if (gameState.player.y - config.playerSize / 2 < config.ceilingHeight) {
        gameState.player.y = config.ceilingHeight + config.playerSize / 2;
        gameState.player.velocityY = 0;
    }
    
    // 糸の開始位置の更新
    if (gameState.web.active) {
        gameState.web.startX = gameState.player.x;
        gameState.web.startY = gameState.player.y;
    }
}

// スイングの更新
function updateSwing() {
    // 糸の長さを計算
    const dx = gameState.web.endX - gameState.player.x;
    const dy = gameState.web.endY - gameState.player.y;
    const currentLength = Math.sqrt(dx * dx + dy * dy);
    
    // 現在の糸の長さを保存（デバッグ用）
    const previousLength = gameState.web.length;
    
// 糸の長さを調整（上キー・下キー）- キーを押している間だけ調整
if (gameState.keys.up && gameState.web.length > 50) {
    // 上キーが押されている場合のみ、糸を短くする（上る）
    gameState.web.length -= 8; // 登る速さを4倍に増加
    console.log("上キーが押されています - 糸を短くします");
} else if (gameState.keys.down) {
    // 下キーが押されている場合のみ、糸を長くする（下る）
    gameState.web.length += 2;
} else {
    // 上キーを離した直後の場合、現在の距離を新しい長さとして設定
    // これにより、上キーを離したら即座に上るのを停止する
    if (dx * dx + dy * dy > 0) {  // 0除算を防ぐ
        gameState.web.length = currentLength;
        gameState.web.initialLength = currentLength; // 初期長さも更新
    }
}
    
    // 糸の長さを維持するための力を計算
    if (dx * dx + dy * dy > 0) {  // 0除算を防ぐ
        // 正規化
        const nx = dx / currentLength;
        const ny = dy / currentLength;
        
        // 糸の長さと現在の距離の差に基づいて力を計算
        let force = 0;
        
        if (currentLength > gameState.web.length) {
            // 糸が長すぎる場合（引っ張られる）
            force = (currentLength - gameState.web.length) * 0.1;
        } else if (currentLength < gameState.web.length && !gameState.player.onGround) {
            // 糸が短すぎる場合（弧を描く）- 地面に設置していない場合のみ
            force = (currentLength - gameState.web.length) * 0.1;
        }
        
        // 力が0でない場合のみ速度を更新
        if (force !== 0) {
            // 速度の更新
            gameState.player.velocityX += nx * force;
            gameState.player.velocityY += ny * force;
        }
        
        // 空気抵抗
        gameState.player.velocityX *= 0.98;
        gameState.player.velocityY *= 0.98;
        
        // 振り子の動きを強化（プレイヤーが設置していない場合）
        if (!gameState.player.onGround) {
            // 接線方向の速度を計算（振り子の動き）
            const tangentX = -ny;
            const tangentY = nx;
            
            // 重力による接線方向の加速
            const gravityEffect = config.gravity * 0.5;
            gameState.player.velocityX += tangentX * gravityEffect;
            gameState.player.velocityY += tangentY * gravityEffect;
        }
    }
    
    // デバッグ情報（長さが変わった場合のみ）
    if (previousLength !== gameState.web.length) {
        console.log(`Web length changed: ${previousLength.toFixed(2)} -> ${gameState.web.length.toFixed(2)}, initial=${gameState.web.initialLength.toFixed(2)}, up=${gameState.keys.up}, down=${gameState.keys.down}, currentLength=${currentLength.toFixed(2)}`);
    }
}

// 衝突判定
function checkCollisions() {
    // ゲームが開始されていない場合は判定しない
    if (!gameState.running) return;
    
    // 衝突判定はupdatePlayerPhysics関数内で処理するため、
    // ここでは画面外に出た場合のゲームオーバー判定のみを行う
    
    // 画面下に落ちた場合（画面の下端に触れた時点でゲームオーバー）
    if (gameState.player.y + config.playerSize / 2 > config.height) {
        gameOver();
        return;
    }
    
    // プレイヤーは固定位置なので、左右の画面外判定は不要
}

// ゲームオーバー判定
function checkGameOver() {
    // ゲームが開始されていない場合は判定しない
    if (!gameState.running) return;
    
    // 画面下に落ちた場合（画面の下端に触れた時点でゲームオーバー）
    if (gameState.player.y + config.playerSize / 2 > config.height) {
        gameOver();
        return;
    }
    
    // プレイヤーは固定位置なので、左右の画面外判定は不要
    
    // 障害物の側面との衝突判定
    for (const obstacle of gameState.obstacles) {
        // 障害物の側面との衝突（プレイヤーが障害物の上にいない場合のみ）
        if (!gameState.player.onGround && 
            gameState.player.y + config.playerSize / 2 > obstacle.y - obstacle.height && 
            gameState.player.y - config.playerSize / 2 < obstacle.y) {
            
            // 左側面との衝突
            if (Math.abs(gameState.player.x + config.playerSize / 2 - obstacle.x) < 5) {
                gameOver();
                return;
            }
            
            // 右側面との衝突
            if (Math.abs(gameState.player.x - config.playerSize / 2 - (obstacle.x + obstacle.width)) < 5) {
                gameOver();
                return;
            }
        }
    }
}

// ゲームオーバー処理
function gameOver() {
    gameState.running = false;
    finalScore.textContent = `スコア: ${gameState.score}`;
    gameOverScreen.classList.remove('hidden');
}

// スコア表示の更新
function updateScore(score) {
    scoreDisplay.textContent = score;
}

// ゲームの描画
function draw() {
    // キャンバスのクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景の描画
    drawBackground();
    
    // 天井の描画
    drawCeiling();
    
    // 障害物の描画
    drawObstacles();
    
    // 糸の描画
    if (gameState.web.active) {
        drawWeb();
    }
    
    // プレイヤーの描画
    drawPlayer();
}

// 背景の描画
function drawBackground() {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 天井の描画
function drawCeiling() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, canvas.width, config.ceilingHeight);
}

// 障害物の描画
function drawObstacles() {
    ctx.fillStyle = '#8B4513';
    for (const obstacle of gameState.obstacles) {
        ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
        
        // デバッグ用：障害物の上部を強調表示
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y - obstacle.height);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y - obstacle.height);
        ctx.stroke();
    }
}

// 糸の描画
function drawWeb() {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gameState.web.startX, gameState.web.startY);
    ctx.lineTo(gameState.web.endX, gameState.web.endY);
    ctx.stroke();
}

// プレイヤーの描画
function drawPlayer() {
    // プレイヤーの本体
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, config.playerSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // デバッグ用：プレイヤーの中心と底部を示す
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 1;
    
    // 中心点
    ctx.beginPath();
    ctx.moveTo(gameState.player.x - 5, gameState.player.y);
    ctx.lineTo(gameState.player.x + 5, gameState.player.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gameState.player.x, gameState.player.y - 5);
    ctx.lineTo(gameState.player.x, gameState.player.y + 5);
    ctx.stroke();
    
    // 底部
    ctx.beginPath();
    ctx.moveTo(gameState.player.x - 5, gameState.player.y + config.playerSize / 2);
    ctx.lineTo(gameState.player.x + 5, gameState.player.y + config.playerSize / 2);
    ctx.stroke();
    
    // 状態表示
    ctx.font = '12px Arial';
    if (gameState.player.onGround) {
        ctx.fillStyle = '#00FF00';
        ctx.fillText("ON GROUND", gameState.player.x + 15, gameState.player.y - 15);
    }
    
    if (gameState.web.active) {
        ctx.fillStyle = '#FFFFFF';
        let webStatus = "WEB";
        if (gameState.keys.up) {
            webStatus += " (CLIMBING)";
        } else if (gameState.keys.down) {
            webStatus += " (DESCENDING)";
        } else {
            webStatus += " (FIXED)";
        }
        ctx.fillText(webStatus, gameState.player.x + 15, gameState.player.y);
        
        // 糸の長さ情報を表示
        ctx.fillText(`Length: ${gameState.web.length.toFixed(0)}/${gameState.web.initialLength.toFixed(0)}`, gameState.player.x + 15, gameState.player.y + 15);
    }
}

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// イベントリスナー
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !gameState.running) {
        startGame();
    }
    
    if (e.code === 'ArrowUp') {
        gameState.keys.up = true;
        console.log("上キーを押しました - キー状態:", gameState.keys.up);
    }
    
    if (e.code === 'ArrowDown') {
        gameState.keys.down = true;
        console.log("下キーを押しました - キー状態:", gameState.keys.down);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') {
        gameState.keys.up = false;
        console.log("上キーを離しました - キー状態:", gameState.keys.up);
        
        // 上キーを離した時に、上方向の速度をリセットして上り続けるのを防止
        if (gameState.web.active) {
            // 現在の糸の長さを実際の距離に設定
            const dx = gameState.web.endX - gameState.player.x;
            const dy = gameState.web.endY - gameState.player.y;
            const currentLength = Math.sqrt(dx * dx + dy * dy);
            
            gameState.web.length = currentLength;
            gameState.web.initialLength = currentLength;
            
            // 上方向の速度をリセット（負の値の場合のみ）
            if (gameState.player.velocityY < 0) {
                gameState.player.velocityY = 0;
            }
        }
    }
    
    if (e.code === 'ArrowDown') {
        gameState.keys.down = false;
        console.log("下キーを離しました - キー状態:", gameState.keys.down);
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (!gameState.running) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 天井または障害物に糸を付着
    let attachPoint = null;
    
    // 天井への付着
    if (mouseY <= config.ceilingHeight) {
        attachPoint = { x: mouseX, y: config.ceilingHeight };
    }
    
    // 障害物への付着
    if (!attachPoint) {
        for (const obstacle of gameState.obstacles) {
            if (mouseX >= obstacle.x && mouseX <= obstacle.x + obstacle.width &&
                mouseY >= obstacle.y - obstacle.height && mouseY <= obstacle.y) {
                attachPoint = { x: mouseX, y: mouseY };
                break;
            }
        }
    }
    
    // 付着点が見つかった場合
    if (attachPoint) {
        gameState.web.active = true;
        gameState.web.startX = gameState.player.x;
        gameState.web.startY = gameState.player.y;
        gameState.web.endX = attachPoint.x;
        gameState.web.endY = attachPoint.y;
        
        // 糸の長さを計算 - 初期の糸の長さは実際の距離に設定
        const dx = gameState.web.endX - gameState.web.startX;
        const dy = gameState.web.endY - gameState.web.startY;
        const actualDistance = Math.sqrt(dx * dx + dy * dy);
        gameState.web.length = actualDistance;
        gameState.web.initialLength = actualDistance;  // 初期の長さを保存
        
        console.log("糸を付着: 長さ=" + gameState.web.length.toFixed(2) + ", 初期長さ=" + gameState.web.initialLength.toFixed(2) + ", キー状態: 上=" + gameState.keys.up + ", 下=" + gameState.keys.down);
    }
});

canvas.addEventListener('mouseup', () => {
    gameState.web.active = false;
    // 糸を離した時に初期長さもリセット
    gameState.web.initialLength = 0;
    console.log("糸を離しました - 状態リセット");
});

restartButton.addEventListener('click', () => {
    initGame();
    startGame();
});

// ゲーム開始
function startGame() {
    startScreen.classList.add('hidden');
    gameState.running = true;
}

// 初期化と開始
initGame();
gameLoop();
