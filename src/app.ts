import {Context, Markup, Telegraf, Telegram} from 'telegraf';
import {Update} from 'typegram';
import {Configuration as OpenAIConfiguration, OpenAIApi} from "openai";
import {InputMediaPhoto} from "telegraf/types";

const CHAT_ID = process.env.CHAT_ID as string;
const CHANNEL_ID = process.env.CHANNEL_ID as string;
const OPEN_AI_API_KEY = process.env.OPENAI_TOKEN as string;
const BOT_TOKEN = process.env.BOT_TOKEN as string;
// const IS_PRODUCTION = process.env.NODE_ENV == 'production';

const openAIConfiguration = new OpenAIConfiguration({
    apiKey: OPEN_AI_API_KEY,
});
const openai = new OpenAIApi(openAIConfiguration);

const telegram: Telegram = new Telegram(BOT_TOKEN);

// @ts-ignore
const bot: Telegraf<Context<Update>> = new Telegraf(BOT_TOKEN, {channelMode: true});

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

bot.command('getchatid', (ctx) => {
    const chatId = ctx.message.chat.id
    ctx.reply(`The ID of this chat is ${chatId}`)
})


bot.on('text', async (ctx) => {
    console.log(ctx);
    console.log(ctx.chat);

    // const analytics = CHAT_ID && String(ctx.chat.id) !== CHAT_ID;
    const analytics = !!CHAT_ID;

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
        Promise.resolve()
            .then(() => telegram.sendMessage(
                CHAT_ID,
                message,
                {
                    parse_mode: 'Markdown',
                    disable_notification: true
                }
            ))
            .catch((error) => console.warn('error sendMessage to CHAT_ID', error));
    }

    await openai.createImage({
        prompt: ctx.message.text,
        n: 6,
        size: '1024x1024'
    }).then(x => {
        console.log('x: ', x.data);

        const mediaGroup = x.data.data.map(({url}) => ({
            type: 'photo',
            media: String(url),
            caption: ctx.message.text
        } as InputMediaPhoto));

        if (analytics) Promise.resolve()
            .then(() => telegram.sendMediaGroup(CHANNEL_ID, mediaGroup))
            .catch((error) => console.warn('error sending to CHANNEL_ID', error));

        return ctx.replyWithMediaGroup(mediaGroup, {
                reply_to_message_id: ctx.message.message_id,
            }
        );
    }).catch(y => {
        console.log('y: ', y);
        ctx.reply(String('Request error'));
    });
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
