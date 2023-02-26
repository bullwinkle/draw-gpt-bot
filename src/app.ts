import {Context, Markup, Telegraf, Telegram} from 'telegraf';
import {Update} from 'typegram';
import {Configuration as OpenAIConfiguration, OpenAIApi} from "openai";
import {InputMediaPhoto} from "telegraf/types";

const IS_PRODUCTION = process.env.NODE_ENV == 'production';
const CHAT_ID = Number(process.env.CHAT_ID || 0);
const OPEN_AI_API_KEY = process.env.OPENAI_TOKEN as string;
const BOT_TOKEN = process.env.BOT_TOKEN as string;

const openAIConfiguration = new OpenAIConfiguration({
    apiKey: OPEN_AI_API_KEY,
});
const openai = new OpenAIApi(openAIConfiguration);

const telegram: Telegram = new Telegram(BOT_TOKEN);

const bot: Telegraf<Context<Update>> = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('Hello ' + ctx.from.first_name + '!');
});

bot.help((ctx) => {
    ctx.reply('Send /start to receive a greeting');
    ctx.reply('Send /keyboard to receive a message with a keyboard');
    ctx.reply('Send /quit to stop the bot');
});

bot.command('quit', (ctx) => {
    // Explicit usage
    ctx.telegram.leaveChat(ctx.message.chat.id);

    // Context shortcut
    ctx.leaveChat();
});

bot.command('keyboard', (ctx) => {
    ctx.reply(
        'Keyboard',
        Markup.inlineKeyboard([
            Markup.button.callback('First option', 'first'),
            Markup.button.callback('Second option', 'second'),
            Markup.button.callback('Third option', 'third'),
        ])
    );
});

bot.on('text', async (ctx) => {
    console.log(ctx)
    console.log(ctx.chat)
    // ctx.reply(
    //     'You choose the ' +
    //     (ctx.message.text === 'first' ? 'First' : 'Second') +
    //     ' Option!'
    // );
    //

    const analytics = CHAT_ID && ctx.chat.id !== CHAT_ID;

    if (analytics) {
        const message = `
From:
\`\`\`JSON
${JSON.stringify(ctx.from, null, 2)}
\`\`\`
Message:
\`\`\`JSON
${JSON.stringify(ctx.message, null, 2)}
\`\`\`
`;
        Promise.resolve().then(() => telegram.sendMessage(
            CHAT_ID,
            message,
            {
                parse_mode: 'Markdown',
                disable_notification: true
            }
        ));
    }

    await openai.createImage({
        prompt: ctx.message.text, //user entered input text will store here.
        n: 6, //number of images that are we expecting from OpenAI API.
        size: '1024x1024' //size of image that are we expecting from OpenAI API.
    }).then(x => {
        console.log('x: ', x.data);

        const mediaGroup = x.data.data.map(({url}) => ({
            type: 'photo',
            media: String(url),
            caption: ctx.message.text
        } as InputMediaPhoto));

        if (analytics) Promise.resolve().then(() => telegram.sendMediaGroup(CHAT_ID, mediaGroup));

        return ctx.replyWithMediaGroup(mediaGroup, {
                reply_to_message_id: ctx.message.message_id,
            }
        );
    }).catch(y => {
        console.log('y: ', y);
        ctx.reply(String('Request error'));
    });
});

// bot.on('message', async (ctx) => {
//     console.log(ctx)
//     // @ts-ignore
//     console.log(ctx.update.message.photo.reverse()[0]);
//
//
//     await openai.createImageVariation({
//         prompt: ctx.message.text, //user entered input text will store here.
//         n: 1, //number of images that are we expecting from OpenAI API.
//         size: '1024x1024' //size of image that are we expecting from OpenAI API.
//     }).then(x => {
//         console.log('x: ', x.data);
//
//         ctx.replyWithPhoto({ url: String(x.data.data[0].url) }, { caption: ctx.message.text });
//     }).catch(y => {
//         console.log('y: ', y);
//         ctx.reply(String('Request error'));
//     });
// });


bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
