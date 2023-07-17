import { Telegraf, session, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { code } from 'telegraf/format'
import configure from 'config';
import { ogg } from './convert.js';
import { openAi } from "./API/OpenAI.js";
import { openWeatherMap } from './API/OpenWeatherMap.js';
import { createReadStream, readFileSync } from "fs";

let jobsWithGPT = 0;
let jobs = 0;
let size = "1024x1024";
const MAX_REQUESTS_PER_SECOND = 10;
const requestCounts = {};
const INITIAL_SESSION = {
    users: []
};



let news = ''; // переменная для хранения новостей
const grade = {
    like: 0,
    dislike: 0
};// Обьект для хранения лайков и дизлайков 
// Getting prompt from txt file
const promptGet = (prompt) => {
    try {
        const data = readFileSync(`./src/Prompts/${prompt}.txt`, 'utf8');
        var myVar = data;
        return myVar;
    } catch (err) {
        console.error("Error while getting 'prompt' in txt file", err);
    }
}
// Anti spam messages
setInterval(() => {
    for (const userId in requestCounts) {
        requestCounts[userId] = 0;
    }
}, 2000);
//template keyboard
const keyboard = Markup.keyboard([
    [{ text: '/Ask - Начать работу c Chat GPT' }],
    [{ text: '/CreateImageGPT - Создать изображение' }],
    [{ text: '/VideotoMP3 - Конвертировать видео в MP3' },
    { text: '/weather - Узнать погоду' }],
]).resize();
//template inline keyboard
const inlineKeyboard = Markup.inlineKeyboard([
    [{ text: "Начать работу c Chat GPT", callback_data: "Ask" }, { text: "Сменить тему диалога", callback_data: "New" }],
    [{ text: "Сгенерировать картинку", callback_data: "CreateImageGPT" }],
    [{ text: "Конвертировать видео в MP3", callback_data: "VideotoMP3" }],
    [{ text: "Узнать погоду", callback_data: "weather" }],
    [{ text: "Меню команд", callback_data: "menu" }],
]).resize();
//template inline keyboard
const inlineKeyboardPrompt = Markup.inlineKeyboard([
    [{ text: "Хотите использвать promt: developer mode?", callback_data: "Prompt-01" }],
    [{ text: "Хотите использвать promt: Расширенный GPT?", callback_data: "Prompt-02" }],
]).resize();
//template answer bot
const templateCommand = async (ctx, text, jobsAsk, jobsGPT, session, keyboard) => {
    ctx.session = session
    await ctx.reply(text, keyboard)
    jobs = jobsAsk;
    jobsWithGPT = jobsGPT;
}
//Config bot
const bot = new Telegraf(configure.get('BOT_TOKEN'))
const whitelist = [812466464, 2039520204, 859006425, 1580855418, 960024617]// Список пользователей
const adminChatId = 812466464 // Админы
const subscribers = [812466464, 2039520204, 859006425, 1580855418, 960024617]// Новостные подписчики 
bot.use(session())
//Middleware
bot.use((ctx, next) => {
    const userId = ctx.from.id
    const lastName = (ctx.from.last_name !== null && ctx.from.last_name !== undefined) ? "Фамилия: " + ctx.from.last_name : "Фамилия: Отсутствует"
    requestCounts[userId] = (requestCounts[userId] || 0) + 1;
    if (requestCounts[userId] >= MAX_REQUESTS_PER_SECOND) {
        ctx.reply(code('Воу, превышен лимит запросов! Попробуйте позже.'));
        ctx.replyWithSticker('https://tenor.com/ru/view/veryjokerge-gif-16663226618693274664')
        return;
    }
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

bot.action('New', async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    const session = ctx.session
    templateCommand(ctx, 'Вы сменили тему диалога, жду вашего голосового или текствого сообщения', 1, 1)
    let id = ctx.chat.id
    session[id] = []
})

bot.action('Like', async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    const users = ctx.session.users
    users.find(user => user.id === ctx.chat.id) ? users : users.push({ id: ctx.chat.id, like: 0, disLike: 0 })
    const userInfo = users.find(user => user.id === ctx.chat.id)
    if (userInfo.id === ctx.chat.id && userInfo.like == 1) {
        ctx.reply('Вы уже отреагировали!')
    } else {
        bot.telegram.sendMessage(812466464, code(`Пользователь: @${ctx.from.username} лайкнул вашу новость`))
        ctx.reply('Ваша оценка принята...')
        if (grade.dislike === 0) {
            grade.like++
        } else {
            grade.like++
            grade.dislike--
        }
        const index = users.findIndex(user => user.id === ctx.chat.id);
        if (index !== -1) {
            users[index].like = 1;
            users[index].disLike = 0;
        }
    }
})

bot.action('Dislike', async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    const users = ctx.session.users
    users.find(user => user.id === ctx.chat.id) ? users : users.push({ id: ctx.chat.id, like: 0, disLike: 0 })
    const userInfo = users.find(user => user.id === ctx.chat.id)
    if (userInfo.id === ctx.chat.id && userInfo.disLike == 1) {
        ctx.reply('Вы уже отреагировали!')
    } else {
        bot.telegram.sendMessage(812466464, code(`Пользователь: @${ctx.from.username} дизлайкнул вашу новость`))
        ctx.reply('Ваша оценка принята...')
        if (grade.like === 0) {
            grade.dislike++
        } else {
            grade.like--
            grade.dislike++
        }
        const index = users.findIndex(user => user.id === ctx.chat.id);
        if (index !== -1) {
            users[index].disLike = 1;
            users[index].like = 0;
        }
    }
})

bot.action('Prompt-01', async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    jobs = 1;
    jobsWithGPT = 1;
    ChatGPTChat(ctx, await promptGet('prompt'))
})

bot.action('Prompt-02', async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    jobs = 1;
    jobsWithGPT = 1;
    ChatGPTChat(ctx, await promptGet('prompt2'))
})

bot.action('menu', async (ctx) => {
    await ctx.reply('Полный список команд', keyboard)
})

bot.action('Ask', async (ctx) => {
    templateCommand(ctx, 'Жду вашего голосового или текствого сообщения', 1, 1, INITIAL_SESSION, inlineKeyboardPrompt)
})

bot.action('VideotoMP3', async (ctx) => {
    templateCommand(ctx, 'Жду вашего сообщения c видео файлом', 2)
})

bot.action('weather', async (ctx) => {
    templateCommand(ctx, 'Напишите полное имя города который вас интересует', 3)
})

bot.action('CreateImageGPT', async (ctx) => {
    templateCommand(ctx, 'Вы сменили тему диалога, жду вашего голосового или текствого сообщения', 4, 2)
})
// Commands bot
bot.command(('start'), async (ctx) => {
    await ctx.replyWithSticker('https://media.discordapp.net/attachments/665424976781770759/1083704241476075580/AgnisKokFireplace.gif')
    ctx.telegram.sendMessage(ctx.chat.id,
        `Приветствую тебя ${ctx.message.chat.first_name}${(ctx.message.chat.last_name !== null && ctx.message.chat.last_name !== undefined) ? " " + ctx.message.chat.last_name : ""}! Я твой помощник в работе с chat GPT и в работе с файлами\nАвтор бота: @shaxxxsadid`,
        inlineKeyboard
    )
});
//ChatGPT
bot.command('Ask', async (ctx) => {
    templateCommand(ctx, 'Жду вашего голосового или текствого сообщения', 1, 1, INITIAL_SESSION, inlineKeyboardPrompt)
})
//Convert MP4 to MP3
bot.command('VideotoMP3', async (ctx) => {
    templateCommand(ctx, 'Жду вашего сообщения c видео файлом', 2)
})
//Check the weather
bot.command(('weather'), async (ctx) => {
    await ctx.reply('Напишите полное имя города который вас интересует')
    jobs = 3;
})
//Generate Image whit OpenAiAPI
bot.command(('CreateImageGPT'), async (ctx) => {
    await ctx.reply('Жду вашего голосового или текствого сообщения')
    jobs = 4;
    jobsWithGPT = 2;
})
// Admin commands
// Add News
bot.command('add_news', async ctx => {
    const text = ctx.message.text.substring('/add_news'.length);
    news += text + '\n\n';
    ctx.reply(`📢 Новость добавлена:\n\n${text}`);
});
// Send News
bot.command('send_news', ctx => {
    ctx.session ??= INITIAL_SESSION
    if (ctx.chat.id === adminChatId) {
        subscribers.forEach(async chatId => {
            await ctx.telegram.sendSticker(chatId, 'https://tenor.com/ru/view/whyareyougay-uganda-gay-gif-14399349')
            ctx.telegram.sendMessage(chatId, '📢 Новости:\n\n' + news, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "❤️", callback_data: "Like" }, { text: "👎", callback_data: "Dislike" }]
                    ]
                },
            })
        });
        grade.like = 0
        grade.dislike = 0
        ctx.session.users = []
        
        ctx.reply('👍 Новости отправлены подписчикам.');
        setTimeout(() => { news = ''; }, 200); // очистка переменной новостей после отправки
    } else {
        ctx.reply('❌ Ошибка! Эта команда доступна только администратору бота.');
    }
});

//Convert mp3 to text
const textMp3 = async (ctx, fileType) => {
    //ogg to mp3 convert
    const link = jobs == 2 ? await ctx.telegram.getFileLink(ctx.message.video.file_id) : await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const activeUser = String(ctx.message.from.id)
    const fileOggPath = await ogg.create(link.href, activeUser, fileType)
    const mp3Path = await ogg.toMp3(fileOggPath, activeUser)
    //voice to text convert
    const text = await openAi.voiceToText(mp3Path)
    return jobs == 2 ? mp3Path : text
}

//Function for work with ChatGPT
const ChatGPTChat = async (ctx, text) => {
    ctx.session ??= INITIAL_SESSION
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
                session[chatId].push({ role: openAi.roles.USER, content: text })
                //work with chatGPT
                const response = await openAi.chat(session[chatId])
                response != null ? response : () => {
                    session[chatId] = session[chatId] || []
                    response = "Увы ошибка..."
                }
                //session save answer
                session[chatId].push({ role: openAi.roles.ASSISTANT, content: response })
                await ctx.reply(response, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Желаете сменить тему диалога?", callback_data: "New" }],
                        ]
                    }
                })
                console.log(session)
                break;
            case 2:// Generate image whith openai
                const responseImage = await openAi.createImage(text, size)
                ctx.replyWithPhoto({ url: responseImage })
                break;
        }
        // Audit users history messages in console
        console.log(JSON.stringify(ctx.message.chat.username + " " + text, null, 2))
    } catch (e) {
        console.log("Error while message", e.message)
    }
}

bot.on(message('voice'), async ctx => {
    ctx.session != null ? INITIAL_SESSION : ctx.session
    try {
        const text = await textMp3(ctx, 'ogg')
        switch (jobsWithGPT) {
            case 0: // The user didn't select anything from the menu bar
                ctx.reply(code('Упс! Вы не выбрали с какой фунцией GPT 3.5 будуете работать'))
                break;
            case 1: // Work with ChatGPT
                // bot reply in telegram
                await ctx.reply(code(`Текст вашего запроса: ${text}`))
                await ChatGPTChat(ctx, text)
                break;
            case 2: // Generate image whith openai
                await ctx.reply(code(`Текст вашего запроса: ${text}`))
                await ChatGPTChat(ctx, text)
                break;
        }
        // Audit users history messages in console
        console.log(JSON.stringify(ctx.message.chat.username + " " + text, null, 2))
    } catch (e) {
        ctx.reply(code("Упс! Что-то пошло не так. Попробуйте задать другой вопрос или обратитесь к создателю бота!"))
        console.log("Error while voice message", e.message)
    }
})

bot.on(message('text'), async ctx => {
    ctx.session != null ? INITIAL_SESSION : ctx.session
    switch (jobs) {
        case 0: // The user didn't select anything from the menu bar
            await ctx.reply(code('Выберите действие на панели команд'));
            break;
        case 1: // Work with ChatGPT
            ChatGPTChat(ctx, ctx.message.text);
            break;
        case 3: // Check the weather
            console.log(JSON.stringify(`${ctx.message.chat.username} Запрос погоды '${ctx.message.text}'`, null, 2))
            const response = await openWeatherMap.getWeather(ctx.message.text);
            response != null ? ctx.reply(response) :
                ctx.replyWithSticker('https://media.discordapp.net/attachments/853314536370077768/1044633104305881128/guwienko.gif')
            ctx.reply(code('Упс! Такого города не существует.'))
            break;
        case 4: // Generate image whith openai
            ChatGPTChat(ctx, ctx.message.text);
            break;
    }
})

bot.on(message('video'), async ctx => {
    if (jobs === 2 && jobs != 0) {
        if (ctx.message.video.file_size <= 10485760) {
            const filename = ctx.message.video.file_name;
            let finallFilename = `${ctx.message.from.id}.mp3`;
            await ctx.reply(code("Ваше видео принято. Ожидайте..."))
            // Convert mp4 to mp3
            const mp3Path = await textMp3(ctx, '.mp4')
            const activeUser = String(ctx.message.from.id)
            console.log(`Пользователь: ${ctx.message.chat.username} ${JSON.stringify(mp3Path)} ${finallFilename}`)
            await ctx.telegram.sendDocument(activeUser, { source: createReadStream(mp3Path), filename: finallFilename })
        } else await ctx.reply(code("Размер видео превышает допустимое значение."))
    } else await ctx.reply(code('Выберите действие на панели команд'))
})


bot.launch().then(console.log("Bot just started...")).catch(e => console.error('Ошибка при запуске бота:', e))

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))