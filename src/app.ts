const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear } = goals
const pvp = require('mineflayer-pvp').plugin

// 設定機器人數量
const botCount = 10

// 創建並登入多個機器人
for (let i = 0; i < botCount; i++) {
    createBot(`Notch${i}`, i)
}

async function createBot(username, index) {
    const bot = mineflayer.createBot({
        host: 'localhost',
        username: username,
        password: '12345678',  // 如果你使用的是 Mojang 或 Microsoft 認證，需要提供正確的密碼
        port: 25565,
        auth: 'offline',       // 使用 'offline' 模式，適用於無驗證伺服器
    })

    // 加載 pathfinder 和 pvp 插件
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)

    bot.on('spawn', async () => {
        const mcData = require('minecraft-data')(bot.version)
        const defaultMove = new Movements(bot, mcData)
        bot.pathfinder.setMovements(defaultMove)
        await startRandomMovement(bot)  // 使用 await 確保異步操作的順序性

        // 自動攻擊並跟蹤指定的玩家ID
        startPvP(bot)
    })

    // 记录错误和被踢出服务器的原因
    bot.on('kicked', reason => console.log(`Bot ${index} kicked:`, reason))
    bot.on('error', err => console.log(`Bot ${index} error:`, err))
}

// 隨機移動
async function startRandomMovement(bot) {
    function getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    setInterval(async () => {
        const x = bot.entity.position.x + (Math.random() * 20 - 10)
        const y = bot.entity.position.y
        const z = bot.entity.position.z + (Math.random() * 20 - 10)
        const goal = new GoalNear(x, y, z, 1)
        await bot.pathfinder.setGoal(goal)
    }, getRandomInterval(3000, 7000))

    setInterval(async () => {
        if (Math.random() > 0.5) {
            bot.setControlState('jump', true)
            await new Promise(resolve => setTimeout(resolve, 200))
            bot.setControlState('jump', false)
        }
    }, getRandomInterval(2000, 5000))
}

// PvP 功能 - 攻擊並跟蹤指定玩家ID
var attack_player_id = 'PET_davvgo'
function startPvP(bot) {
    bot.on('physicsTick', () => {
        const target = bot.players[attack_player_id]?.entity
        if (target) {
            // 跟蹤目標玩家
            const goal = new GoalNear(target.position.x, target.position.y, target.position.z, 1)
            bot.pathfinder.setGoal(goal)

            // 開始攻擊
            bot.pvp.attack(target)
        }
    })

    bot.on('stoppedAttacking', () => {
        const target = bot.players[attack_player_id]?.entity
        if (target) {
            bot.pvp.attack(target)
        }
    })
}
