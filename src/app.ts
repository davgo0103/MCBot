const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;
const pvp = require('mineflayer-pvp').plugin;
const vec3 = require('vec3');
const mcData = require('minecraft-data')('1.19.4');
const cluster = require('cluster');

const botCount = 20;
const reconnectDelay = 1000;
const serverHost = process.env.SERVER_HOST || 'localhost';
const serverPort = process.env.SERVER_PORT || 25565;
const attackPlayerID = process.env.ATTACK_PLAYER_ID || 'PET_davvgo';
const serverPassword = process.env.SERVER_PASSWORD || '12345678';
const tag = process.env.BOT_TAG || 'pwp_';

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    for (let i = 0; i < botCount; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    console.log(`Worker ${process.pid} started`);
    createBot(`${tag}${cluster.worker.id}`, cluster.worker.id);
}

function createBot(username, index) {
    let bot = createBotInstance(username, index);
    bot.on('spawn', () => {
        const defaultMove = new Movements(bot, mcData);
        defaultMove.allowParkour = true;
        defaultMove.allowSprinting = true;
        defaultMove.scafoldingBlocks = [mcData.blocksByName.cobblestone.id];
        bot.pathfinder.setMovements(defaultMove);
        startBehavior(bot);
    });
    bot.on('death', () => {
        console.log(`Bot ${index} died and is respawning...`);
        bot.respawn();
    });
    bot.on('kicked', reason => {
        console.log(`Bot ${index} kicked:`, reason);
        setTimeout(() => createBotInstance(username, index), reconnectDelay);
    });
    bot.on('error', err => {
        console.error(`Bot ${index} error:`, err);
        setTimeout(() => createBotInstance(username, index), reconnectDelay);
    });
}

function createBotInstance(username, index) {
    const bot = mineflayer.createBot({
        host: serverHost,
        username: username,
        password: serverPassword,
        port: serverPort,
        version: '1.19.4',
        auth: 'offline',
        timeout: 60000
    });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(pvp);
    return bot;
}

function startBehavior(bot) {
    let lastUpdate = Date.now();
    const updateInterval = 500; // 更新間隔 (毫秒)

    bot.on('physicsTick', () => {
        const now = Date.now();
        if (now - lastUpdate > updateInterval) {
            lastUpdate = now;
            const target = bot.players[attackPlayerID]?.entity;
            if (target) {
                const newPos = target.position.floored();
                const currentGoal = bot.pathfinder.goal;

                if (currentGoal && currentGoal.position && !currentGoal.position.equals(newPos)) {
                    bot.pathfinder.setGoal(new GoalNear(newPos.x, newPos.y, newPos.z, 1));
                }
                if (!bot.pvp.target) {
                    bot.pvp.attack(target);
                }
                placeBlockToNavigate(bot, target);
            } else {
                randomMove(bot);
            }
        }
    });
}

function placeBlockToNavigate(bot, target) {
    if (!target) return;

    const targetPos = target.position.floored();
    const botPos = bot.entity.position.floored();
    const direction = targetPos.minus(botPos).normalize();
    const heightDiff = targetPos.y - botPos.y;

    if (heightDiff > 0) {
        // 自動墊高
        placeBlocksToReachHeight(bot, botPos, heightDiff);
    } else {
        // 處理 x 和 z 方向上的方塊放置
        const nextPositions = [
            botPos.offset(direction.x, 0, direction.z),
            botPos.offset(direction.x, -1, direction.z)
        ];

        nextPositions.forEach(pos => {
            if (needsBlock(bot, pos)) {
                placeBlock(bot, pos);
            }
        });
    }

    // 防止 BOT 在空中跳躍
    const targetY = target.position.y;
    const botY = bot.entity.position.y;
    if (Math.abs(targetY - botY) < 1.5) {
        bot.entity.velocity = new vec3(0, 0, 0);
    }
}

function placeBlocksToReachHeight(bot, startPos, heightDiff) {
    for (let i = 0; i < heightDiff; i++) {
        const pos = startPos.offset(0, i + 1, 0);
        if (needsBlock(bot, pos)) {
            placeBlock(bot, pos);
        }
    }
}

function placeBlock(bot, position) {
    const blockToPlace = bot.inventory.items().find(item => item.name === 'cobblestone');
    if (blockToPlace) {
        bot.equip(blockToPlace, 'hand', (err) => {
            if (err) {
                console.log('Error equipping block:', err);
                return;
            }
            // 使用最小延遲
            bot.placeBlock(bot.blockAt(position), vec3(0, 1, 0), (err) => {
                if (err) console.log('Error placing block:', err);
            });
        });
    }
}

function needsBlock(bot, position) {
    const blockBelow = bot.blockAt(position.offset(0, -1, 0));
    return !blockBelow || blockBelow.type === 0;
}

function randomMove(bot) {
    if (!bot.pathfinder.isMoving()) {
        const x = bot.entity.position.x + (Math.random() * 20 - 10);
        const y = bot.entity.position.y;
        const z = bot.entity.position.z + (Math.random() * 20 - 10);
        const goal = new GoalNear(x, y, z, 1);
        bot.pathfinder.setGoal(goal);
    }
}
