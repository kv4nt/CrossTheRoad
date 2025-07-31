const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 672, // 21 строка * 32 пикселя
    backgroundColor: '#87CEEB',
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: { debug: true }
    },
    scene: {
        preload,
        create,
        update
    }
};

const ROWS = 21;
const SAFE_ROWS = 3;
const ROW_HEIGHT = 32;
const ROW_HEIGHT_PLAYER = 16;
const COLS = 11;
const OBSTACLE_TYPES = ['stone', 'tree', 'water', 'fence', 'house'];

// Типы монет с ключами спрайтов, ценностью и масштабом
const COIN_TYPES = {
    bronze: { key: 'bronze_coin', value: 1, scale: 1.2 },
    silver: { key: 'silver_coin', value: 3, scale: 1.5 },
    gold: { key: 'gold_coin', value: 5, scale: 1.7 }
};

let game = new Phaser.Game(config);

let level = 1;
let deaths = 0;
let coins = 0;
let world;
let obstacles = [];

let player;
let carsGroup;
let trainsGroup;
let obstaclesGroup;
let coinsGroupBronze;
let coinsGroupSilver;
let coinsGroupGold;
let gameOver = false;

let dialogVisible = false;
let savedPlayerPos = null;

let backgroundSound, carSound, trainSound, coinSound, stepSound;

function preload() {
    // Прогресс-бар загрузки
    var progressBar = this.add.graphics();
    var progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(40, 270, 220, 50);

    var width = this.cameras.main.width;
    var height = this.cameras.main.height;
    var loadingText = this.make.text({
        x: width / 2,
        y: height / 2 - 50,
        text: 'Loading...',
        style: {
            font: '20px monospace',
            fill: '#ffffff'
        }
    });
    loadingText.setOrigin(0.5, 0.5);

    var percentText = this.make.text({
        x: width / 2,
        y: height / 2 - 5,
        text: '0%',
        style: {
            font: '18px monospace',
            fill: '#ffffff'
        }
    });
    percentText.setOrigin(0.5, 0.5);

    var assetText = this.make.text({
        x: width / 2,
        y: height / 2 + 70,
        text: '',
        style: {
            font: '18px monospace',
            fill: '#ffffff'
        }
    });
    assetText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value) => {
        percentText.setText(parseInt(value * 100) + '%');
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRect(40, 270, 300 * value, 30);
    });

    this.load.on('fileprogress', (file) => {
        assetText.setText('Loading asset: ' + file.key);
    });

    this.load.on('complete', () => {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
        percentText.destroy();
        assetText.destroy();
    });

    // your existing asset loading code below

    this.load.spritesheet('idle_down', 'assets/businessman1_idle_down.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('idle_up', 'assets/businessman1_idle_up.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('idle_left', 'assets/businessman1_idle_left.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('idle_right', 'assets/businessman1_idle_right.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });

    this.load.spritesheet('walk_down', 'assets/businessman1_walk_down.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('walk_up', 'assets/businessman1_walk_up.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('walk_left', 'assets/businessman1_walk_left.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });
    this.load.spritesheet('walk_right', 'assets/businessman1_walk_right.png', { frameWidth: 8, frameHeight: ROW_HEIGHT_PLAYER });

    this.load.image('car', 'assets/car.png');
    for (let i = 1; i <= 4; i++) {
        this.load.image(`train_${i}`, `assets/train_${i}.png`);
    }

    this.load.image('road', 'assets/road.png');
    this.load.image('rail', 'assets/rail.png');
    this.load.image('grass', 'assets/grass.png');

    this.load.image('stone', 'assets/stone.png');
    this.load.image('tree', 'assets/tree.png');
    this.load.image('water', 'assets/water.png');
    this.load.image('fence', 'assets/fence.png');
    this.load.image('house', 'assets/house.png');

    this.load.image('bronze_coin', 'assets/bronze_coin.png');
    this.load.image('silver_coin', 'assets/silver_coin.png');
    this.load.image('gold_coin', 'assets/gold_coin.png');

    // Заменено на .mp3, как вы просили
    this.load.audio('backgroundSound', 'sound/background.mp3');
    this.load.audio('carSound', 'sound/car.wav');
    this.load.audio('trainSound', 'sound/train.ogg');
    this.load.audio('coinSound', 'sound/coin.wav');
    this.load.audio('stepSound', 'sound/step.wav');
}


function create() {
    //this.cameras.main.setBackgroundColor('#87CEEB');


    carSound = this.sound.add('carSound');
    alert(1);
    trainSound = this.sound.add('trainSound');
    coinSound = this.sound.add('coinSound');
    stepSound = this.sound.add('stepSound');
    backgroundSound = this.sound.add('backgroundSound', { loop: true });
    this.input.once('pointerdown', () => {
        if (!backgroundSound.isPlaying) {
            backgroundSound.play();
        }
    });
    world = generateLevel(level);
    obstacles = generateObstacles(level);

    drawWorld(this);

    carsGroup = this.physics.add.group();
    trainsGroup = this.physics.add.group();

    createVehicles(this);

    obstaclesGroup = this.physics.add.staticGroup();
    placeObstacles(this);

    player = this.physics.add.sprite(0, 0, 'idle_down')
        .setScale(2)
        .setCollideWorldBounds(true);

    player.setSize(8, 16);
    player.setOffset(0, 0);

    player.gridRow = 0;
    player.gridCol = 0;
    player.currentDirection = null;
    player.isMoving = false;
    player.moveTween = null;

    createPlayerAnimations(this);

    coinsGroupBronze = this.physics.add.group();
    coinsGroupSilver = this.physics.add.group();
    coinsGroupGold = this.physics.add.group();

    placeCoins(this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.levelText = this.add.text(10, 10, `Уровень: ${level}`, { fontSize: '20px', fill: '#FF0000', fontStyle: 'bold' }).setDepth(100).setVisible(true);
    this.deathText = this.add.text(10, 35, `Смертей: ${deaths}`, { fontSize: '20px', fill: '#FF0000', fontStyle: 'bold' }).setDepth(100).setVisible(true);
    this.coinsText = this.add.text(config.width - 10, 10, `Монеты: ${coins}`, {
        fontSize: '20px',
        fill: '#FFD700',
        fontStyle: 'bold'
    }).setOrigin(1, 0).setDepth(100).setVisible(true);

    this.messageText = this.add.text(config.width / 2, config.height / 2, '', {
        fontSize: '28px',
        fill: '#FF0000',
        fontStyle: 'bold',
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: { x: 20, y: 10 },
        align: 'center'
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.dialogGroup = this.add.group();

    this.physics.add.collider(player, obstaclesGroup);

    this.physics.add.collider(player, carsGroup, () => {
        if (!dialogVisible && isPlayerOnDangerRow()) onPlayerHit(this, 'машина');
    }, null, this);

    this.physics.add.collider(player, trainsGroup, () => {
        if (!dialogVisible && isPlayerOnDangerRow()) onPlayerHit(this, 'поезд');
    }, null, this);

    this.physics.add.overlap(player, coinsGroupBronze, collectCoin, null, this);
    this.physics.add.overlap(player, coinsGroupSilver, collectCoin, null, this);
    this.physics.add.overlap(player, coinsGroupGold, collectCoin, null, this);

    const colWidth = config.width / COLS;
    const leftPadding = 8;
    player.x = player.gridCol * colWidth + leftPadding;
    player.y = config.height - (player.gridRow + 0.5) * ROW_HEIGHT;

    // --- Добавляем мобильное управление ---
    // Переменные для свайпа
    this.input.on('pointerdown', onPointerDown, this);
    this.input.on('pointerup', onPointerUp, this);

    this.touchStartPos = null;
    this.touchEndPos = null;
}

function update(time, delta) {
    if (gameOver || dialogVisible) return;

    updateVehicles(delta);
    handlePlayerInput(this); // Для клавиатуры

    // Мобильный ввод обновляется через слушатели pointerdown / pointerup

    if (player.gridRow >= ROWS - 1) {
        showLevelComplete(this);
    }
}

// Обработчики для моб. управления
function onPointerDown(pointer) {
    if (gameOver || dialogVisible) return;

    this.touchStartPos = { x: pointer.x, y: pointer.y };
}

function onPointerUp(pointer) {
    if (gameOver || dialogVisible) return;
    if (!this.touchStartPos) return;

    this.touchEndPos = { x: pointer.x, y: pointer.y };

    const deltaX = this.touchEndPos.x - this.touchStartPos.x;
    const deltaY = this.touchEndPos.y - this.touchStartPos.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const swipeThreshold = 20; // минимальное расстояние для распознавания свайпа

    // Если это тап (не свайп), перемещение в зависимости от позиции касания по отношению к игроку
    if (absX < swipeThreshold && absY < swipeThreshold) {
        handleTapInput(this, this.touchEndPos.x, this.touchEndPos.y);
    } else {
        // Это свайп — определяем направление
        if (absX > absY) {
            if (deltaX > 0) movePlayer(this, 'right');
            else movePlayer(this, 'left');
        } else {
            if (deltaY > 0) movePlayer(this, 'down');
            else movePlayer(this, 'up');
        }
    }
    this.touchStartPos = null;
    this.touchEndPos = null;
}

// При тапе — определяем направление движения к экрану от позиции игрока
function handleTapInput(scene, tapX, tapY) {
    if (player.isMoving) return;
    const colWidth = config.width / COLS;
    const leftPadding = 8;

    const playerX = player.x;
    const playerY = player.y;

    // Разница по координатам между тапом и игроком
    const diffX = tapX - playerX;
    const diffY = tapY - playerY;

    // Если тап близко к игроку, ничего не делаем
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) return;

    // Определяем главную ось движения (больше смещения)
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) movePlayer(scene, 'right');
        else movePlayer(scene, 'left');
    } else {
        if (diffY > 0) movePlayer(scene, 'down');
        else movePlayer(scene, 'up');
    }
}

// Функция движения игрока в конкретном направлении (если возможно)
function movePlayer(scene, direction) {
    if (player.isMoving || gameOver || dialogVisible) return;

    let newRow = player.gridRow;
    let newCol = player.gridCol;

    switch (direction) {
        case 'up':
            if (player.gridRow < ROWS - 1 && !isObstacleAt(player.gridRow + 1, player.gridCol)) {
                newRow++;
            } else return;
            break;
        case 'down':
            if (player.gridRow > 0 && !isObstacleAt(player.gridRow - 1, player.gridCol)) {
                newRow--;
            } else return;
            break;
        case 'left':
            if (player.gridCol > 0 && !isObstacleAt(player.gridRow, player.gridCol - 1)) {
                newCol--;
            } else return;
            break;
        case 'right':
            if (player.gridCol < COLS - 1 && !isObstacleAt(player.gridRow, player.gridCol + 1)) {
                newCol++;
            } else return;
            break;
        default:
            return;
    }

    player.isMoving = true;
    player.currentDirection = direction;

    const colWidth = config.width / COLS;
    const leftPadding = 8;

    const newX = newCol * colWidth + leftPadding;
    const newY = config.height - (newRow + 0.5) * ROW_HEIGHT;

    player.anims.play(`walk_${direction}`, true);

    if (player.moveTween) {
        player.moveTween.stop();
        player.moveTween = null;
    }

    stepSound.play();

    player.moveTween = scene.tweens.add({
        targets: player,
        x: newX,
        y: newY,
        duration: 150,
        onComplete: () => {
            player.gridRow = newRow;
            player.gridCol = newCol;
            player.isMoving = false;
            player.moveTween = null;

            let currentAnimKey = player.anims.currentAnim ? player.anims.currentAnim.key : null;
            if (!currentAnimKey || !currentAnimKey.startsWith('idle_')) {
                player.anims.play(`idle_${direction}`, true);
            }
        }
    });
}


function generateLevel(level) {
    const worldRows = [];
    for (let i = 0; i < SAFE_ROWS; i++) {
        worldRows.push({ type: 'grass' });
    }
    let safeProb = Math.max(0.1, 0.5 - (level - 1) * 0.05);
    for (let i = SAFE_ROWS; i < ROWS; i++) {
        if (Math.random() < safeProb) {
            worldRows.push({ type: 'grass' });
        } else {
            worldRows.push(Math.random() < 0.5 ? { type: 'road' } : { type: 'rail' });
        }
    }
    return worldRows;
}

function generateObstacles(level) {
    const safeRowsIndices = [];
    for (let i = 2; i < ROWS; i++) {
        if (world[i].type === 'grass') safeRowsIndices.push(i);
    }
    const numObstacles = Math.min(20, 3 + Math.floor(level * 1.5));
    const positions = new Set();
    const result = [];

    while (result.length < numObstacles && safeRowsIndices.length > 0) {
        let row = Phaser.Utils.Array.GetRandom(safeRowsIndices);
        let col = Phaser.Math.Between(0, COLS - 1);
        const key = `${row}:${col}`;

        if (
            !positions.has(key) &&
            !(row === 0 && col === 0)
        ) {
            positions.add(key);
            const type = Phaser.Utils.Array.GetRandom(OBSTACLE_TYPES);
            result.push({ row, col, type });
        }
    }

    return result;
}

function drawWorld(scene) {
    scene.children.each(child => {
        if (child.tilePositionX !== undefined) child.destroy();
    });
    for (let i = 0; i < ROWS; i++) {
        const y = config.height - (i + 0.5) * ROW_HEIGHT;
        const type = world[i].type;
        let texture = 'grass';
        if (type === 'road') texture = 'road';
        else if (type === 'rail') texture = 'rail';
        scene.add.tileSprite(config.width / 2, y, config.width, ROW_HEIGHT, texture);
    }
}

function placeObstacles(scene) {
    if (obstaclesGroup) obstaclesGroup.clear(true, true);
    else obstaclesGroup = scene.physics.add.staticGroup();

    const colWidth = config.width / COLS;
    for (const obs of obstacles) {
        const x = obs.col * colWidth + 8;
        const y = config.height - (obs.row + 0.5) * ROW_HEIGHT;
        const sprite = obstaclesGroup.create(x, y, obs.type);
        sprite.setDisplaySize(32, 32);
        sprite.refreshBody();
    }
}

// Функция размещения монет трёх типов:
function placeCoins(scene) {
    coinsGroupBronze.clear(true, true);
    coinsGroupSilver.clear(true, true);
    coinsGroupGold.clear(true, true);

    const colWidth = config.width / COLS;

    const safeRowsIndices = [];
    const roadRowsIndices = [];
    const railRowsIndices = [];

    for (let i = 0; i < ROWS; i++) {
        const t = world[i].type;
        if (t === 'grass') safeRowsIndices.push(i);
        else if (t === 'road') roadRowsIndices.push(i);
        else if (t === 'rail') railRowsIndices.push(i);
    }

    // Проверка занятости ячейки
    function isCellFree(row, col) {
        if (isObstacleAt(row, col)) return false;
        if (player.gridRow === row && player.gridCol === col) return false;

        const allCoins = [
            ...coinsGroupBronze.getChildren(),
            ...coinsGroupSilver.getChildren(),
            ...coinsGroupGold.getChildren()
        ];
        for (let c of allCoins) {
            if (c.row === row && c.col === col) return false;
        }
        return true;
    }

    const numBronze = Phaser.Math.Between(1, 5);
    let placed = 0;
    let tries = 0;
    while (placed < numBronze && tries < 100) {
        tries++;
        let row = Phaser.Utils.Array.GetRandom(safeRowsIndices);
        let col = Phaser.Math.Between(0, COLS - 1);
        if (!isCellFree(row, col)) continue;
        let x = col * colWidth + 8;
        let y = config.height - (row + 0.5) * ROW_HEIGHT;
        let coin = coinsGroupBronze.create(x, y, COIN_TYPES.bronze.key).setScale(COIN_TYPES.bronze.scale);
        coin.setOrigin(0.5, 0.5);
        coin.row = row;
        coin.col = col;
        placed++;
    }

    const numSilver = Phaser.Math.Between(1, 3);
    placed = 0; tries = 0;
    while (placed < numSilver && tries < 100) {
        tries++;
        let row = Phaser.Utils.Array.GetRandom(roadRowsIndices);
        let col = Phaser.Math.Between(0, COLS - 1);
        if (!isCellFree(row, col)) continue;
        let x = col * colWidth + 8;
        let y = config.height - (row + 0.5) * ROW_HEIGHT;
        let coin = coinsGroupSilver.create(x, y, COIN_TYPES.silver.key).setScale(COIN_TYPES.silver.scale);
        coin.setOrigin(0.5, 0.5);
        coin.row = row;
        coin.col = col;
        placed++;
    }

    const numGold = Phaser.Math.Between(1, 2);
    placed = 0; tries = 0;
    while (placed < numGold && tries < 100) {
        tries++;
        let row = Phaser.Utils.Array.GetRandom(railRowsIndices);
        let col = Phaser.Math.Between(0, COLS - 1);
        if (!isCellFree(row, col)) continue;
        let x = col * colWidth + 8;
        let y = config.height - (row + 0.5) * ROW_HEIGHT;
        let coin = coinsGroupGold.create(x, y, COIN_TYPES.gold.key).setScale(COIN_TYPES.gold.scale);
        coin.setOrigin(0.5, 0.5);
        coin.row = row;
        coin.col = col;
        placed++;
    }
}

function createVehicles(scene) {
    carsGroup.clear(true, true);
    trainsGroup.clear(true, true);

    for (let i = SAFE_ROWS; i < ROWS; i++) {
        const row = world[i];
        if (row.type === 'road' || row.type === 'rail') {
            if (Math.random() > 0.4) continue;
            const fromLeft = Math.random() < 0.5;

            const y = config.height - (i + 0.5) * ROW_HEIGHT;
            const speedBase = 50 + level * 15;
            const speed = speedBase + Math.random() * speedBase;

            if (row.type === 'road') {
                const car = carsGroup.create(fromLeft ? -50 : config.width + 50, y, 'car');
                car.setOrigin(0.5, 0.5);
                car.setDisplaySize(car.width * (32 / car.height), 32);
                car.speed = fromLeft ? speed : -speed;
                car.row = i;
                car.flipX = false;
            } else {
                const idx = Phaser.Math.Between(1, 4);
                const train = trainsGroup.create(fromLeft ? -80 : config.width + 80, y, `train_${idx}`);
                train.setOrigin(0.5, 0.5);
                train.setDisplaySize(train.width * (32 / train.height), 32);
                train.speed = fromLeft ? speed * 0.7 : -speed * 0.7;
                train.row = i;
                train.flipX = !fromLeft;
            }
        }
    }
}

function updateVehicles(delta) {
    carsGroup.children.iterate(c => {
        if (!c) return;
        c.x += c.speed * delta / 1000;
        if (c.speed > 0 && c.x > config.width + 100) c.x = -100;
        else if (c.speed < 0 && c.x < -100) c.x = config.width + 100;
    });
    trainsGroup.children.iterate(t => {
        if (!t) return;
        t.x += t.speed * delta / 1000;
        if (t.speed > 0 && t.x > config.width + 150) t.x = -150;
        else if (t.speed < 0 && t.x < -150) t.x = config.width + 150;
    });
}

function createPlayerAnimations(scene) {
    const directions = ['down', 'up', 'left', 'right'];
    directions.forEach(dir => {
        scene.anims.create({
            key: `idle_${dir}`,
            frames: scene.anims.generateFrameNumbers(`idle_${dir}`, { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });
        scene.anims.create({
            key: `walk_${dir}`,
            frames: scene.anims.generateFrameNumbers(`walk_${dir}`, { start: 0, end: 3 }),
            frameRate: 12,
            repeat: -1
        });
    });
}

function isPlayerOnDangerRow() {
    if (player.gridRow < 0 || player.gridRow >= ROWS) return false;
    const type = world[player.gridRow]?.type;
    return type === 'road' || type === 'rail';
}

function isObstacleAt(row, col) {
    return obstacles.some(obs => obs.row === row && obs.col === col);
}

function handlePlayerInput(scene) {
    if (player.isMoving || gameOver || dialogVisible) return;

    let moved = false;
    let newRow = player.gridRow;
    let newCol = player.gridCol;
    let newDir = player.currentDirection;

    const colWidth = config.width / COLS;
    const leftPadding = 8;

    if (Phaser.Input.Keyboard.JustDown(scene.cursors.up) || Phaser.Input.Keyboard.JustDown(scene.wasd.up)) {
        if (player.gridRow < ROWS - 1 && !isObstacleAt(player.gridRow + 1, player.gridCol)) {
            newRow++;
            newDir = 'up';
            moved = true;
        }
    } else if (Phaser.Input.Keyboard.JustDown(scene.cursors.down) || Phaser.Input.Keyboard.JustDown(scene.wasd.down)) {
        if (player.gridRow > 0 && !isObstacleAt(player.gridRow - 1, player.gridCol)) {
            newRow--;
            newDir = 'down';
            moved = true;
        }
    } else if (Phaser.Input.Keyboard.JustDown(scene.cursors.left) || Phaser.Input.Keyboard.JustDown(scene.wasd.left)) {
        if (player.gridCol > 0 && !isObstacleAt(player.gridRow, player.gridCol - 1)) {
            newCol--;
            newDir = 'left';
            moved = true;
        }
    } else if (Phaser.Input.Keyboard.JustDown(scene.cursors.right) || Phaser.Input.Keyboard.JustDown(scene.wasd.right)) {
        if (player.gridCol < COLS - 1 && !isObstacleAt(player.gridRow, player.gridCol + 1)) {
            newCol++;
            newDir = 'right';
            moved = true;
        }
    }

    if (moved) {
        stepSound.play();
        player.isMoving = true;
        player.currentDirection = newDir;

        const newX = newCol * colWidth + leftPadding;
        const newY = config.height - (newRow + 0.5) * ROW_HEIGHT;

        player.anims.play(`walk_${newDir}`, true);

        if (player.moveTween) {
            player.moveTween.stop();
            player.moveTween = null;
        }

        player.moveTween = scene.tweens.add({
            targets: player,
            x: newX,
            y: newY,
            duration: 150,
            onComplete: () => {
                player.gridRow = newRow;
                player.gridCol = newCol;
                player.isMoving = false;
                player.moveTween = null;

                let currentAnimKey = player.anims.currentAnim ? player.anims.currentAnim.key : null;
                if (!currentAnimKey || !currentAnimKey.startsWith('idle_')) {
                    player.anims.play(`idle_${newDir}`, true);
                }
            }
        });
    } else {
        let currentAnimKey = player.anims.currentAnim ? player.anims.currentAnim.key : null;
        if (!player.anims.isPlaying || !currentAnimKey || !currentAnimKey.startsWith('idle_')) {
            let dir = player.currentDirection || 'down';
            player.anims.play(`idle_${dir}`, true);
            player.currentDirection = dir;
        }
    }
}

// Сбор монеты (работает на все три группы)
function collectCoin(player, coin) {
    coin.destroy();

    let value = COIN_TYPES.bronze.value; // По умолчанию
    if (coinsGroupBronze.contains(coin)) value = COIN_TYPES.bronze.value;
    else if (coinsGroupSilver.contains(coin)) value = COIN_TYPES.silver.value;
    else if (coinsGroupGold.contains(coin)) value = COIN_TYPES.gold.value;

    coins += value;
    coinSound.play();
    this.coinsText.setText(`Монеты: ${coins}`);
}

function onPlayerHit(scene, hitType) {
    if (gameOver) return;

    if (coins >= 10 && !dialogVisible) {
        dialogVisible = true;
        savedPlayerPos = { row: player.gridRow, col: player.gridCol, dir: player.currentDirection };
        showContinueDialog(scene);
    } else {
        gameOver = true;
        deaths++;
        scene.deathText.setText(`Смертей: ${deaths}`);
        scene.levelText.setText(`Уровень: ${level}`);

        if (hitType === 'машина') {
            carSound.play();
        } else {
            trainSound.play();
        }

        const message = hitType === 'машина' ? 'Вас сбила машина!' : 'Вас сбил поезд!';
        showMessage(scene, message, () => {
            resetLevel(scene);
        });
    }
}

function showContinueDialog(scene) {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const bg = scene.add.rectangle(centerX, centerY, 300, 150, 0xffffff, 0.9).setDepth(310);
    const dialogText = scene.add.text(centerX, centerY - 40, 'Продолжить за 10 монет?', {
        fontSize: '24px',
        fill: '#000000',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 280 }
    }).setOrigin(0.5).setDepth(311);

    const btnYes = scene.add.text(centerX - 70, centerY + 30, 'Да', {
        fontSize: '28px',
        fill: '#00aa00',
        fontStyle: 'bold',
        backgroundColor: '#d0ffd0',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive().setDepth(311);

    const btnNo = scene.add.text(centerX + 70, centerY + 30, 'Нет', {
        fontSize: '28px',
        fill: '#aa0000',
        fontStyle: 'bold',
        backgroundColor: '#ffd0d0',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive().setDepth(311);

    scene.dialogGroup.clear(true, true);
    scene.dialogGroup.addMultiple([bg, dialogText, btnYes, btnNo]);

    btnYes.once('pointerdown', () => {
        coins -= 10;
        scene.coinsText.setText(`Монеты: ${coins}`);
        hideContinueDialog(scene);
        continueGame(scene);
    });

    btnNo.once('pointerdown', () => {
        hideContinueDialog(scene);
        gameOver = true;
        deaths++;
        scene.deathText.setText(`Смертей: ${deaths}`);
        scene.levelText.setText(`Уровень: ${level}`);
        showMessage(scene, 'Игра окончена!', () => resetLevel(scene));
    });
}

function hideContinueDialog(scene) {
    scene.dialogGroup.clear(true, true);
    dialogVisible = false;
}

function continueGame(scene) {
    gameOver = false;
    if (!savedPlayerPos) {
        resetLevel(scene);
        return;
    }
    player.gridRow = savedPlayerPos.row;
    player.gridCol = savedPlayerPos.col;
    player.currentDirection = savedPlayerPos.dir || 'down';
    player.isMoving = false;

    const colWidth = config.width / COLS;
    const leftPadding = 8;

    player.x = player.gridCol * colWidth + leftPadding;
    player.y = config.height - (player.gridRow + 0.5) * ROW_HEIGHT;

    player.anims.play(`idle_${player.currentDirection}`, true);
    player.setVisible(true);
    player.setDepth(100);

    savedPlayerPos = null;
}

function showMessage(scene, text, callback) {
    scene.messageText.setText(text);
    scene.messageText.setAlpha(0);
    scene.messageText.setVisible(true);
    scene.messageText.setDepth(300);
    scene.tweens.add({
        targets: scene.messageText,
        alpha: 1,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
            scene.input.once('pointerdown', () => {
                scene.tweens.add({
                    targets: scene.messageText,
                    alpha: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => {
                        scene.messageText.setVisible(false);
                        if (callback) callback();
                    }
                });
            });
        }
    });
}

function showLevelComplete(scene) {
    gameOver = true;

    coins += 5; // За прохождение уровня +5 монет
    scene.coinsText.setText(`Монеты: ${coins}`);

    showMessage(scene, `Уровень ${level} пройден! +5 монет`, () => {
        level++;
        scene.levelText.setText(`Уровень: ${level}`);
        resetLevel(scene);
        gameOver = false;
    });
}

function resetLevel(scene) {
    scene.messageText.setAlpha(0);
    scene.messageText.setVisible(false);
    world = generateLevel(level);
    obstacles = generateObstacles(level);
    drawWorld(scene);
    placeObstacles(scene);
    createVehicles(scene);
    placeCoins(scene);

    player.gridRow = 0;
    player.gridCol = 0;
    const colWidth = config.width / COLS;
    const leftPadding = 8;
    player.x = player.gridCol * colWidth + leftPadding;
    player.y = config.height - (player.gridRow + 0.5) * ROW_HEIGHT;
    player.currentDirection = null;
    player.isMoving = false;

    player.anims.play('idle_down');
    player.setVisible(true);
    player.setDepth(100);
    player.body.updateFromGameObject();

    scene.levelText.setVisible(true);
    scene.deathText.setVisible(true);
    scene.coinsText.setVisible(true);

    scene.levelText.setDepth(100);
    scene.deathText.setDepth(100);
    scene.coinsText.setDepth(100);

    gameOver = false;
}
