const TelegramBot = require('node-telegram-bot-api');

// Токен вашего бота
const token = '7800982422:AAHki4BbdIYY9e0_fH1oeOClVV_Exe9VFoo';

// ID администратора (ваш ID в Telegram)
const ADMIN_ID = 2121095196; // ID администратора

// Создаем бота
const bot = new TelegramBot(token, { polling: true });

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Hi! I am a support bot Flit ai. Please describe your problem.');
});

// Обработка всех остальных сообщений
bot.on('message', (msg) => {
    if (ADMIN_ID) {
        // Формируем информацию о пользователе
        let userInfo = 'Сообщение от пользователя:\n';
        userInfo += `ID: ${msg.from.id}\n`;
        userInfo += `Имя: ${msg.from.first_name}\n`;
        if (msg.from.last_name) {
            userInfo += `Фамилия: ${msg.from.last_name}\n`;
        }
        if (msg.from.username) {
            userInfo += `Username: @${msg.from.username}\n`;
        }

        // Отправляем информацию администратору
        bot.sendMessage(ADMIN_ID, userInfo);
        
        // Пересылаем сообщение администратору
        bot.forwardMessage(ADMIN_ID, msg.chat.id, msg.message_id)
            .catch(error => {
                console.error('Ошибка при пересылке сообщения:', error);
            });
    } else {
        console.error('ADMIN_ID не установлен!');
    }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
});

console.log('Бот запущен'); 