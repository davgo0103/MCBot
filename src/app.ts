import { version } from "typescript"

const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear } = goals
const pvp = require('mineflayer-pvp').plugin

// 設定機器人數量
const botCount = 50
const reconnectDelay = 1000  // 重連延遲時間（毫秒）
const loginDelay = 400       // 每個 BOT 之間的登入延遲（毫秒）

// 創建並登入多個機器人
for (let i = 0; i < botCount; i++) {
    setTimeout(() => {
        createBot(`Notch${i}`, i)
    }, i * loginDelay);  // 每個機器人的創建時間間隔 200 毫秒
}

async function createBot(username, index) {
    let bot = createBotInstance(username, index)

    bot.on('spawn', async () => {
        const mcData = require('minecraft-data')(bot.version)
        const defaultMove = new Movements(bot, mcData)
        bot.pathfinder.setMovements(defaultMove)
        await startBehavior(bot)  // 使用 await 確保異步操作的順序性
    })

    bot.on('kicked', reason => {
        console.log(`Bot ${index} kicked:`, reason)
        setTimeout(() => bot = createBotInstance(username, index), reconnectDelay)  // 延遲後重新嘗試連接
    })

    bot.on('error', err => {
        console.log(`Bot ${index} error:`, err)
        setTimeout(() => bot = createBotInstance(username, index), reconnectDelay)  // 延遲後重新嘗試連接
    })

    bot.on('error', (err) => {
        console.error(`Bot ${index} error:`, err);
        console.error(`Full error object:`, JSON.stringify(err));
        setTimeout(() => bot = createBotInstance(username, index), reconnectDelay);
    });
}

function createBotInstance(username, index) {
    const bot = mineflayer.createBot({
        host: 'localhost',
        username: username,
        password: '12345678',  // 如果你使用的是 Mojang 或 Microsoft 認證，需要提供正確的密碼
        port: 25565,
        version: '1.19.4',
        auth: 'offline',       // 使用 'offline' 模式，適用於無驗證伺服器
    })

    // 加載 pathfinder 和 pvp 插件
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)

    return bot
}

// 行為邏輯：跟蹤或隨機移動
async function startBehavior(bot) {
    setInterval(async () => {
        const target = bot.players[attack_player_id]?.entity
        if (target) {
            // 如果玩家存在，跟蹤目標玩家
            const goal = new GoalNear(target.position.x, target.position.y, target.position.z, 1)
            bot.pathfinder.setGoal(goal)

            // 開始攻擊
            bot.pvp.attack(target)
        } else {
            // 玩家不存在，隨機移動
            const x = bot.entity.position.x + (Math.random() * 20 - 10)
            const y = bot.entity.position.y
            const z = bot.entity.position.z + (Math.random() * 20 - 10)
            const goal = new GoalNear(x, y, z, 1)
            await bot.pathfinder.setGoal(goal)
        }
    }, 1000)  // 每秒檢查一次
}

// PvP 功能 - 當玩家存在時執行攻擊
var attack_player_id = 'PET_davvgo'
function startPvP(bot) {
    bot.on('stoppedAttacking', () => {
        const target = bot.players[attack_player_id]?.entity
        if (target) {
            bot.pvp.attack(target)
        }
    })
}
