require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;
const pvp = require('mineflayer-pvp').plugin;
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const botCount = 1;
const reconnectDelay = 1000;
const serverHost = process.env.SERVER_HOST || 'localhost';
const serverPort = process.env.SERVER_PORT || 25565;
const attackPlayerID = process.env.ATTACK_PLAYER_ID || 'XxTimmyHungxX';
const serverPassword = process.env.SERVER_PASSWORD || '12345678';

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < botCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    // Workers can share any TCP connection
    // In this case, it is an HTTP server
    console.log(`Worker ${process.pid} started`);

    createBot(`Hi${cluster.worker.id}`, cluster.worker.id);
}

function createBot(username, index) {
    let bot = createBotInstance(username, index);

    bot.on('spawn', () => {
        const mcData = require('minecraft-data')(bot.version);
        const defaultMove = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMove);
        startBehavior(bot);
    });

    bot.on('death', () => {
        console.log(`Bot ${index} died and is respawning...`);
        bot.respawn(); // 正確的重生方法
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
    setInterval(() => {
        const target = bot.players[attackPlayerID]?.entity;
        if (target) {
            const goal = new GoalNear(target.position.x, target.position.y, target.position.z, 1);
            bot.pathfinder.setGoal(goal);
            if (!bot.pvp.target) {
                bot.pvp.attack(target);
            }
        } else {
            randomMove(bot);
        }
    }, 200);
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
