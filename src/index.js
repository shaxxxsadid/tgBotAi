import { Telegraf, session, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { code } from 'telegraf/format'
import configure from 'config';
import { ogg } from './convert.js';
import { openAi } from "./API/OpenAI.js";
import { openWeatherMap } from './API/OpenWeatherMap.js';
import { createReadStream, readFileSync } from "fs";

const keyboard = Markup.keyboard([
    [{ text: '/Ask - Начать работу c Chat GPT' },
    { text: '/New - Сменить тему диалога' }],
    [{ text: '/CreateImageGPT - Создать изображение' }],
    [{ text: '/MP4toMP3 - Конвертировать MP4 в MP3' },
    { text: '/weather - Узнать погоду' }],
]).resize();
const INITIAL_SESSION = {
    // users: [],
    // messages: []
}

const bot = new Telegraf(configure.get('BOT_TOKEN'))
const whitelist = [812466464, 2039520204, 859006425, 1580855418, 960024617]
bot.use(session())
bot.use((ctx, next) => {
    const userId = ctx.from.id
    const lastName = (ctx.from.last_name !== null && ctx.from.last_name !== undefined) ? "Фамилия: " + ctx.from.last_name : "Фамилия: Отсутствует"
    if (whitelist.includes(userId)) {
        // Если пользователь в whitelist, вызываем следующий middleware
        console.log(`ID пользователя: ${userId}\nUsername: @${ctx.from.username}\nИмя: ${ctx.from.first_name}\n${lastName}\nРазрешение в доступе: Доступ разрешен`)
        return next()
    } else {
        // Если пользователь не в whitelist, отправляем сообщение об ошибке
        console.log(`ID пользователя: ${userId}\nUsername: @${ctx.from.username}\nИмя: ${ctx.from.first_name}\n${lastName}\nРазрешение в доступе: Доступ запрещен`)
        return ctx.reply('У вас нет доступа к этому боту.')
    }
})

let jobsWithGPT = 0
let jobs = 0
let size = "1024x1024"

bot.command(('start'), async (ctx) => {
    ctx.replyWithSticker('https://media.discordapp.net/attachments/665424976781770759/1083704241476075580/AgnisKokFireplace.gif')
    ctx.telegram.sendMessage(ctx.chat.id, `Приветствую тебя ${ctx.message.chat.first_name}${(ctx.message.chat.last_name !== null && ctx.message.chat.last_name !== undefined) ? " " + ctx.message.chat.last_name : ""}! Я твой помощник в работе с chat GPT и в работе с файлами\nАвтор бота: @shaxxxsadid`,
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Начать работу c Chat GPT", callback_data: "Ask" }, { text: "Сменить тему диалога", callback_data: "New" }],
                    [{ text: "Сгенерировать картинку", callback_data: "CreateImageGPT" }],
                    [{ text: "Конвертировать MP4 в MP3", callback_data: "MP4toMP3" }],
                    [{ text: "Узнать погоду", callback_data: "weather" }],
                    [{ text: "Меню команд", callback_data: "menu" }],
                ]
            }
        })
});

bot.action('New', async (ctx) => {
    ctx.session = {}
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 1;
    jobsWithGPT = 1;
})


bot.action('menu', async (ctx) => {
    await ctx.reply('Полный список команд', keyboard)
})

bot.action('Ask', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 1;
    jobsWithGPT = 1;
})

bot.action('MP4toMP3', async (ctx) => {
    await ctx.reply('Жду вашего сообщения c видео файлом')
    jobs = 2;
})

bot.action('weather', async (ctx) => {
    await ctx.reply('Напишите полное имя города который вас интересует')
    jobs = 3;
})

bot.action('CreateImageGPT', async (ctx) => {
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 4;
    jobsWithGPT = 2;
})

//new session
bot.command('New', async (ctx) => {
    ctx.session = {}
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 1;
    jobsWithGPT = 1;
})

bot.command('Ask', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 1;
    jobsWithGPT = 1;
})

bot.command('MP4toMP3', async (ctx) => {
    await ctx.reply('Жду вашего сообщения c видео файлом')
    jobs = 2;
})

bot.command(('weather'), async (ctx) => {
    await ctx.reply('Напишите полное имя города который вас интересует')
    jobs = 3;
})

bot.command(('CreateImageGPT'), async (ctx) => {
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 4;
    jobsWithGPT = 2;
})

bot.on(message('voice'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    try {
        await ctx.reply(code('Сообщение принято. Ожидайте...'))
        //ogg to mp3 convert
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const activeUser = String(ctx.message.from.id)
        const fileOggPath = await ogg.create(link.href, activeUser, 'ogg')
        const mp3Path = await ogg.toMp3(fileOggPath, activeUser)
        //voice to text convert
        const text = await openAi.voiceToText(mp3Path)
        //work with chatGPT
        const chatId = ctx.chat.id
        const session = ctx.session
        switch (jobsWithGPT) {
            case 0: ctx.reply(code('Упс! Вы не выбрали с какой фунцией GPT 3.5 будуете работать'))
                break;
            case 1: session[chatId] = session[chatId] || []
                // bot reply in telegram
                await ctx.reply(code(`Текст вашего запроса: ${text}`))
                //session save ask 
                session[chatId].push({ role: openAi.roles.USER, content: text })
                const responseChat = await openAi.chat(session[chatId])
                //session save answer
                session[chatId].push({ role: openAi.roles.ASSISTANT, content: responseChat })
                await ctx.reply(responseChat)
                break;
            case 2: await ctx.reply(code(`Текст вашего запроса: ${text}`))
                const responseImage = await openAi.createImage(text, size)
                ctx.replyWithPhoto({ url: responseImage })
                break;
        }
        // Audit users history messages in console
        console.log(JSON.stringify(ctx.message.chat.username + " " + text, null, 2))
    } catch (e) {
        ctx.reply(code("Упс! Что-то пошло не так. Попробуйте задать другой вопрос или обратитесь к создателю бота!"))
        console.log("Error while voice message", e.message)
    }
})

const ChatGPTChat = async (ctx) => {
    const chatId = ctx.chat.id
    const session = ctx.session
    try {
        await ctx.reply(code('Сообщение принято. Ожидайте...'))
        switch (jobsWithGPT) {
            case 0: ctx.reply(code('Упс! Вы не выбрали с какой фунцией GPT 3.5 будуете работать'))
                break;
            case 1:
                session[chatId] = session[chatId] || []
                //session save ask
                session[chatId].push({ role: openAi.roles.USER, content: ctx.message.text })
                //work with chatGPT
                const response = await openAi.chat(session[chatId])
                response != null ? response : () => {
                    session[chatId] = session[chatId] || []
                    response = "Увы ошибка..."
                }
                //session save answer
                session[chatId].push({ role: openAi.roles.ASSISTANT, content: response })
                await ctx.reply(response)
                console.log(session)
                break;
            case 2: const responseImage = await openAi.createImage(ctx.message.text, size)
                ctx.replyWithPhoto({ url: responseImage })
                break;
        }
        // Audit users history messages in console
        console.log(JSON.stringify(ctx.message.chat.username + " " + ctx.message.text, null, 2))
    } catch (e) {
        console.log("Error while message", e.message)
    }
}

bot.on(message('text'), async ctx => {
    ctx.session ??= INITIAL_SESSION
    switch (jobs) {
        case 0: await ctx.reply(code('Выберите действие на панели команд'));
            break;
        case 1: ChatGPTChat(ctx);
            break;
        case 3:
            console.log(JSON.stringify(`${ctx.message.chat.username} Запрос погоды '${ctx.message.text}'`, null, 2))
            const response = await openWeatherMap.getWeather(ctx.message.text);
            response != null ? ctx.reply(response) : ctx.reply(code('Упс! Такого города не существует.'))
            break;
        case 4: ChatGPTChat(ctx);
            break;
    }

})

bot.on(message('video'), async ctx => {
    if (jobs === 2 && jobs != 0) {
        if (ctx.message.video.file_size <= 10485760) {
            let filename = ctx.message.video.file_name;
            filename = `${filename.substr(0, filename.length - 4)}.mp3`;
            await ctx.reply(code("Ваше видео принято. Ожидайте..."))

            const link = await ctx.telegram.getFileLink(ctx.message.video.file_id)
            const activeUser = String(ctx.message.from.id)
            const fileOggPath = await ogg.create(link.href, activeUser, 'mp4')
            const mp3Path = await ogg.toMp3(fileOggPath, activeUser)

            console.log(`Пользователь: ${ctx.message.chat.username} ${JSON.stringify(mp3Path)} ${filename}`)
            await ctx.telegram.sendDocument(activeUser, { source: createReadStream(mp3Path), filename: filename })
        } else await ctx.reply(code("Размер видео превышает допустимое значение."))
    } else await ctx.reply(code('Выберите действие на панели команд'))
})


bot.launch().then(console.log("Bot just started...")).catch(e => console.error('Ошибка при запуске бота:', e))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

