const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const http = require('http'); 
const { Server } = require('socket.io'); 
const path = require('path');
const helmet = require('helmet'); // ЕЛЕМЕНТ БЕЗПЕКИ 1: Захист заголовків від XSS та експлуатацій
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet()); // Активація Helmet для базового захисту експрес-додатка

// Створення HTTP сервера для підтримки WebSockets
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // URL вашого фронтенду
        methods: ["GET", "POST"]
    }
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// =========================================================================
// ЕЛЕМЕНТ БЕЗПЕКИ 2: МІДЛВАР ДЛЯ ПЕРЕВІРКИ JWT ТОКЕНА ТА РОЗМЕЖУВАННЯ РОЛЕЙ (RBAC)
// =========================================================================
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Очікуємо формат "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: "Доступ заборонено: відсутній токен авторизації" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Записуємо id та role користувача в об'єкт запиту req
        next(); // Передаємо хід наступній функції-обробнику
    } catch (err) {
        return res.status(403).json({ error: "Недійсний або прострочений токен" });
    }
};

// Мідлвар для перевірки прав адміністратора
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: "Доступ відхилено: потрібні права адміністратора" });
    }
};
// =========================================================================

// --- TELEGRAM BOT LOGIC ---
const sendTelegramMessage = async (chatId, message) => {
    // ЕЛЕМЕНТ БЕЗПЕКИ 3: Токен винесено в змінні оточення .env
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return console.error("Помилка: TELEGRAM_BOT_TOKEN не задано в .env");
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (err) { console.error("Telegram error:", err); }
};

app.post('/api/telegram-webhook', async (req, res) => {
    res.sendStatus(200);
    const { message } = req.body;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();

    try {
        if (text.startsWith('/start')) {
            await sendTelegramMessage(chatId, "Вітаємо в <b>OnyxDent</b>! 🏥\nЯ ваш персональний асистент. Скористайтеся меню або натисніть /help.");
        } else if (text === '/password') {
            await sendTelegramMessage(chatId, "Введіть номер телефону у форматі <b>+380...</b>");
        } else if (text === '/info') {
            await sendTelegramMessage(chatId, "<b>OnyxDent</b> — сучасна стоматологія. ✨\n📍 Черкаси, вул. Центральна, 1\n⏰ Пн-Сб 08:00 - 20:00");
        } else if (text === '/help') {
            await sendTelegramMessage(chatId, `<b>Команди:</b>\n/services - Послуги\n/doctors - Лікарі\n/password - Пароль\n/info - Про клініку\n/my_appointments - Візити\n/schedule - Графік`);
        } else if (text === '/services') {
            const result = await pool.query('SELECT title, price FROM services ORDER BY title ASC');
            const servicesList = result.rows.map(s => `🔹 ${s.title}: <b>${s.price} грн</b>`).join('\n');
            await sendTelegramMessage(chatId, `<b>Наші послуги:</b>\n\n${servicesList}`);
        } else if (text === '/doctors') {
            const result = await pool.query("SELECT full_name FROM users WHERE role = 'doctor'");
            const doctorsList = result.rows.map(d => `👨‍⚕️ ${d.full_name}`).join('\n');
            await sendTelegramMessage(chatId, `<b>Наші спеціалісти:</b>\n\n${doctorsList}`);
        } else if (text === '/my_appointments' || text === '/history') {
            await sendTelegramMessage(chatId, "Для отримання даних введіть свій телефон у форматі +380XXXXXXXXX.");
        } else if (text.startsWith('+380')) {
            const filePath = path.join(__dirname, 'generated_passwords.txt');
            if (fs.existsSync(filePath)) {
                const logContent = fs.readFileSync(filePath, 'utf8');
                const userLine = logContent.split('\n').find(line => line.includes(text));

                if (userLine) {
                    const password = userLine.split('Пароль: ')[1]?.trim();
                    const userDb = await pool.query('SELECT id FROM users WHERE phone = $1', [text]);

                    if (userDb.rows.length > 0) {
                        const userId = userDb.rows[0].id;
                        await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE id = $2', [chatId, userId]);

                        const appointments = await pool.query(
                            "SELECT a.appointment_date, s.title FROM appointments a JOIN services s ON a.service_id = s.id WHERE a.patient_id = $1 AND a.status = 'planned' ORDER BY a.appointment_date LIMIT 3", [userId]
                        );
                        
                        // ОНОВЛЕНО: Тепер змінна password загорнута в тег <tg-spoiler>
                        let response = `✅ Ваш пароль: <tg-spoiler>${password}</tg-spoiler>\n🔔 <b>Сповіщення активовано!</b>\n\n`;
                        
                        if (appointments.rows.length > 0) {
                            response += "<b>Найближчі візити:</b>\n" + appointments.rows.map(a => `📅 ${new Date(a.appointment_date).toLocaleString('uk-UA')}\n🦷 ${a.title}`).join('\n\n');
                        } else { response += "ℹ️ Запланованих візитів немає."; }
                        await sendTelegramMessage(chatId, response);
                    } else {
                        // ОНОВЛЕНО: Тут також ховаємо під спойлер для нових профілів
                        await sendTelegramMessage(chatId, `✅ Ваш пароль: <tg-spoiler>${password}</tg-spoiler>\n\n(Профіль очікує активації адміном)`);
                    }
                } else { await sendTelegramMessage(chatId, "❌ Користувача не знайдено."); }
            }
        } else if (text === '/schedule') {
            await sendTelegramMessage(chatId, "⏰ <b>Графік роботи:</b>\nПн-Пт: 08:00 - 20:00\nСб: 09:00 - 15:00\nНд: Вихідний");
        }
    } catch (err) { console.error(err); }
});

// --- ЛОГІКА CHAT (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('Користувач підключився до чату:', socket.id);

    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`Користувач ${userId} увійшов у свою кімнату чату`);
    });

    // 1. Оновлення збереження повідомлення (повертаємо згенерований ID)
socket.on('send_message', async (data) => {
        const { senderId, receiverId, text } = data;
        try {
            // 1. Зберігаємо повідомлення в БД та отримуємо його ID
            const result = await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, message_text) VALUES ($1, $2, $3) RETURNING id",
                [senderId, receiverId, text]
            );
            const insertedId = result.rows[0].id;
            
            // Передаємо повідомлення разом з його ID назад клієнтам у браузері
            const payload = { ...data, id: insertedId, isEdited: false };
            io.to(receiverId).emit('receive_message', payload);
            socket.emit('message_sent_success', { temporaryTime: data.time, realId: insertedId });

            // 2. ТРИГЕР ТЕЛЕГРАМУ: Надсилаємо сповіщення в Telegram отримувачу, якщо він підключив бота
            try {
                const infoRes = await pool.query(`
                    SELECT 
                        r.telegram_chat_id AS receiver_tg_id,
                        s.full_name AS sender_name
                    FROM users s
                    CROSS JOIN users r
                    WHERE s.id = $1 AND r.id = $2
                `, [senderId, receiverId]);

                if (infoRes.rows.length > 0) {
                    const { receiver_tg_id, sender_name } = infoRes.rows[0];
                    
                    // Якщо в отримувача заповнений telegram_chat_id — відправляємо сповіщення
                    if (receiver_tg_id) {
                        const tgMessage = `💬 <b>Нове повідомлення в чаті OnyxDent!</b>\n\n` +
                                          `👤 <b>Відправник:</b> ${sender_name}\n` +
                                          `✉️ <b>Текст:</b> ${text.length > 100 ? text.substring(0, 100) + '...' : text}\n\n` +
                                          `👉 Перейдіть в особистий кабінет на сайті, щоб відповісти.`;
                        
                        await sendTelegramMessage(receiver_tg_id, tgMessage);
                    }
                }
            } catch (tgErr) {
                console.error("Помилка відправки чат-сповіщення в Telegram:", tgErr);
            }

        } catch (err) {
            console.error("Помилка збереження повідомлення:", err);
        }
    });

// 2. Нова подія: Редагування повідомлення через WebSockets
socket.on('edit_message', async (data) => {
    const { id, receiverId, text } = data;
    try {
        await pool.query(
            "UPDATE messages SET message_text = $1, is_edited = TRUE WHERE id = $2",
            [text, id]
        );
        io.to(receiverId).emit('message_edited', { id, text });
    } catch (err) {
        console.error("Помилка редагування повідомлення:", err);
    }
});

// 3. Нова подія: Видалення повідомлення через WebSockets
socket.on('delete_message', async (data) => {
    const { id, receiverId } = data;
    try {
        await pool.query("DELETE FROM messages WHERE id = $1", [id]);
        // Сповіщаємо отримувача про видалення
        io.to(receiverId).emit('message_deleted', { id });
    } catch (err) {
        console.error("Помилка видалення повідомлення:", err);
    }
});

    socket.on('disconnect', () => {
        console.log('Користувач відключився від чату');
    });
});

app.get('/api/profile', verifyToken, (req, res) => {
    res.json({ message: "OK", user: req.user });
});

// Ендпоінт для отримання історії чату (захищено токеном)
app.get('/api/chat/history/:userId1/:userId2', verifyToken, async (req, res) => {
    const { userId1, userId2 } = req.params;
    try {
        const result = await pool.query(`
            SELECT id, sender_id as "senderId", receiver_id as "receiverId", 
                   message_text as text, sent_at as time, is_edited as "isEdited"
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY sent_at ASC`, [userId1, userId2]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Помилка завантаження історії чату');
    }
});

// --- АВТОРИЗАЦІЯ ---
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        if (userResult.rows.length === 0) return res.status(401).json({ message: 'Користувача не знайдено' });

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Неправильний пароль' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, name: user.full_name, role: user.role, phone: user.phone } });
    } catch (err) {
        res.status(500).send('Помилка сервера');
    }
});

// 1. Ендпоінт для клієнта: подача заявки «Забули пароль»
app.post('/api/auth/forgot-password', async (req, res) => {
    const { phone } = req.body;

    try {
        // Перевіряємо, чи існує такий користувач у системі
        const userCheck = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Користувача з таким номером телефону не знайдено в системі.' 
            });
        }

        const patientId = userCheck.rows[0].id;

        // Перевіряємо, чи не надіслано таку заявку раніше
        const activeReq = await pool.query(
            "SELECT id FROM admin_notifications WHERE patient_id = $1 AND type = 'reset_password'",
            [patientId]
        );

        if (activeReq.rows.length > 0) {
            return res.status(400).json({ 
                message: 'Заявку на скидання пароля вже надіслано адміністратору. Очікуйте на підтвердження.' 
            });
        }

        // Вставляємо запит у таблицю сповіщень для адміністратора
        await pool.query(
            "INSERT INTO admin_notifications (patient_id, type, created_at) VALUES ($1, 'reset_password', NOW())",
            [patientId]
        );

        res.json({ 
            message: 'Заявку на скидання пароля успішно надіслано адміністратору.' 
        });

    } catch (err) {
        console.error("Помилка forgot-password:", err);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});


// 2. Ендпоінт для адміна: підтвердження скидання пароля
app.put('/api/admin/notifications/reset-password/:id', verifyToken, async (req, res) => {
    const notificationId = req.params.id;
    const { patientId } = req.body;

    try {
        // Крок А: Генеруємо новий випадковий пароль із 8 символів
        const generatedPassword = Math.random().toString(36).slice(-8);

        // Крок Б: Отримуємо номер телефону пацієнта
        const userRes = await pool.query('SELECT phone FROM users WHERE id = $1', [patientId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Пацієнта не знайдено' });
        }
        const patientPhone = userRes.rows[0].phone;

        // Крок В: ЛОГІКА ПЕРЕЗАПИСУ В ОДИН РЯДОК У ФАЙЛІ generated_passwords.txt
        const filePath = path.join(__dirname, 'generated_passwords.txt');
        const newRecord = `Тел: ${patientPhone} | Пароль: ${generatedPassword}`;
        
        let fileLines = [];
        
        // Якщо файл вже існує, зчитуємо його та фільтруємо
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // Розбиваємо файл на масив рядків і очищаємо від порожніх пробілів
            fileLines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            // Видаляємо стару згадку про цей телефон, якщо вона там була
            fileLines = fileLines.filter(line => !line.includes(`Тел: ${patientPhone}`));
        }
        
        // Додаємо оновлений запис у масив рядків
        fileLines.push(newRecord);
        
        // Перезаписуємо файл усім оновленим масивом, об'єднаним через перенос рядка
        fs.writeFileSync(filePath, fileLines.join('\n') + '\n', 'utf8');
        console.log(`[FILE UPDATE SUCCESS] Дані для телефону ${patientPhone} успішно перезаписано.`);

        // Крок Г: Хешуємо новий пароль для бази даних
        const hashedNewPassword = await bcrypt.hash(generatedPassword, 10);

        // Крок ⏳: Оновлюємо значення в PostgreSQL
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNewPassword, patientId]);

        // Крок Д: Очищаємо оброблену нотифікацію
        await pool.query('DELETE FROM admin_notifications WHERE id = $1', [notificationId]);

        // Повертаємо згенерований пароль на фронтенд адміна для виведення в alert
        res.json({ 
            message: 'Пароль успішно оновлено.',
            newPassword: generatedPassword 
        });

    } catch (err) {
        console.error("Помилка на сервері при reset-password:", err);
        res.status(500).json({ error: 'Не вдалося скинути пароль' });
    }
});

// --- ФУНКЦІЇ ЛІКАРЯ ---
app.get('/api/doctor/appointments/:doctorId', verifyToken, async (req, res) => {
    const { doctorId } = req.params;
    try {
        const result = await pool.query(`
            SELECT a.id, u.full_name as patient_name, u.phone as patient_phone, 
                   a.appointment_date, a.status, a.notes, s.title as service_title
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            JOIN services s ON a.service_id = s.id
            WHERE a.doctor_id = $1
            ORDER BY a.appointment_date ASC`, [doctorId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Помилка завантаження розкладу');
    }
});

app.post('/api/doctor/add-appointment', verifyToken, async (req, res) => {
    const { doctorId, isNewPatient, patientName, patientPhone, serviceId, date, autoPassword } = req.body;

    try {
        await pool.query('BEGIN');
        let patientId;

        if (isNewPatient) {
            const hashedPassword = await bcrypt.hash(autoPassword, 10);
            const newUser = await pool.query(
                "INSERT INTO users (full_name, phone, role, password_hash) VALUES ($1, $2, 'patient', $3) RETURNING id",
                [patientName, patientPhone, hashedPassword]
            );
            patientId = newUser.rows[0].id;
            fs.appendFileSync('generated_passwords.txt', `Тел: ${patientPhone} | Пароль: ${autoPassword}\n`);
        } else {
            const user = await pool.query("SELECT id FROM users WHERE phone = $1", [patientPhone]);
            if (user.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ message: "Пацієнта з таким номером не знайдено. Оберіть 'Новий пацієнт'." });
            }
            patientId = user.rows[0].id;
        }

        await pool.query(
            "INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_date, status) VALUES ($1, $2, $3, $4, 'planned')",
            [patientId, doctorId, serviceId, date]
        );

        await pool.query('COMMIT');

        // ТРИГЕР ТЕЛЕГРАМУ
        try {
            const infoRes = await pool.query(`
                SELECT p.telegram_chat_id, d.full_name as doc_name, s.title as service_title
                FROM users p
                CROSS JOIN users d
                CROSS JOIN services s
                WHERE p.id = $1 AND d.id = $2 AND s.id = $3
            `, [patientId, doctorId, serviceId]);

            if (infoRes.rows.length > 0 && infoRes.rows[0].telegram_chat_id) {
                const info = infoRes.rows[0];
                const formattedDate = new Date(date).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                const msg = `📅 <b>Новий запис на прийом!</b>\n\n👨‍⚕️ <b>Лікар:</b> ${info.doc_name}\n🦷 <b>Послуга:</b> ${info.service_title}\n⏰ <b>Час:</b> ${formattedDate}\n\nЧекаємо на вас у клініці OnyxDent! 🏥`;
                await sendTelegramMessage(info.telegram_chat_id, msg);
            }
        } catch (tgErr) { console.error(tgErr); }

        res.status(200).json({ message: "Запис створено успішно" });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Помилка сервера при створенні запису" });
    }
});

app.put('/api/doctor/update-notes/:appointmentId', verifyToken, async (req, res) => {
    const { appointmentId } = req.params;
    const { notes, status } = req.body;
    try {
        await pool.query(
            'UPDATE appointments SET notes = $1, status = $2 WHERE id = $3',
            [notes, status, appointmentId]
        );
        res.json({ message: "Дані візиту оновлено" });
    } catch (err) {
        res.status(500).send('Помилка при збереженні нотаток');
    }
});

app.get('/api/doctor/my-patients/:doctorId', verifyToken, async (req, res) => {
    const { doctorId } = req.params;
    try {
        const result = await pool.query(`
            SELECT DISTINCT u.id, u.full_name, u.phone, u.email
            FROM users u
            JOIN appointments a ON u.id = a.patient_id
            WHERE a.doctor_id = $1
            ORDER BY u.full_name ASC`, [doctorId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Помилка отримання пацієнтів');
    }
});

app.get('/api/doctor/pending-cards/:doctorId', verifyToken, async (req, res) => {
    const { doctorId } = req.params;
    try {
        const result = await pool.query(
            `SELECT id, patient_name, patient_phone, appointment_date, service_title 
             FROM appointments 
             WHERE doctor_id = $1 
               AND appointment_date < NOW() 
               AND (notes IS NULL OR notes = '')
             ORDER BY appointment_date DESC`,
            [doctorId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка сервера" });
    }
});


// --- ФУНКЦІЇ ПАЦІЄНТА ---

// Отримання списку лікарів, у яких пацієнт був на прийомі
app.get('/api/patient/my-doctors/:patientId', verifyToken, async (req, res) => {
    const { patientId } = req.params;
    try {
        const result = await pool.query(`
            SELECT DISTINCT u.id, u.full_name, u.phone 
            FROM users u
            JOIN appointments a ON u.id = a.doctor_id
            WHERE a.patient_id = $1
            ORDER BY u.full_name ASC`, [patientId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Помилка завантаження списку лікарів" });
    }
});
app.get('/api/patient/appointments/:patientId', verifyToken, async (req, res) => {
    const { patientId } = req.params;
    const { doctorId } = req.query; // Зчитуємо ?doctorId=... якщо він є

    try {
        let queryText = `
            SELECT a.id, u.full_name as doctor_name, s.title as service_title, 
                   a.appointment_date, a.status, a.notes
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            JOIN services s ON a.service_id = s.id
            WHERE a.patient_id = $1
        `;
        
        const queryParams = [patientId];

        if (doctorId) {
            queryText += ` AND a.doctor_id = $2`;
            queryParams.push(doctorId);
        }

        queryText += ` ORDER BY a.appointment_date DESC`;

        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error("Помилка історії пацієнта:", err);
        res.status(500).send('Помилка завантаження історії пацієнта');
    }
});

app.post('/api/patient/request-appointment', async (req, res) => {
    const { patientName, patientPhone, serviceId } = req.body;

    if (!patientName || patientName === 'null' || !patientPhone || !serviceId) {
        return res.status(400).json({ error: "Помилка: Відсутні або некоректні обов'язкові дані" });
    }

    try {
        await pool.query(
            "INSERT INTO appointment_requests (patient_name, patient_phone, service_id, status) VALUES ($1, $2, $3, 'pending')",
            [patientName, patientPhone, serviceId]
        );
        return res.status(201).json({ message: "Заявку на запис успішно надіслано" });
    } catch (err) {
        return res.status(500).json({ error: "Внутрішня помилка сервера" });
    }
});

app.post('/api/patient/create-admin-request', verifyToken, async (req, res) => {
    const { patientId, type, appointmentId, password } = req.body;
    try {
        if (type === 'delete_account') {
            const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [patientId]);
            if (userRes.rows.length === 0) return res.status(404).json({ error: "Користувача не знайдено" });

            const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
            if (!isMatch) return res.status(401).json({ error: "Неправильний пароль!" });
        }

        await pool.query(
            "INSERT INTO admin_notifications (patient_id, type, appointment_id, status) VALUES ($1, $2, $3, 'pending')",
            [patientId, type, appointmentId || null]
        );
        res.json({ message: "Заявку успішно надіслано адміністратору" });
    } catch (err) {
        res.status(500).json({ error: "Помилка сервера" });
    }
});



// --- АДМІНІСТРАТОР ТА ЗАЯВКИ ---
app.post('/api/admin/add-visit', verifyToken, requireAdmin, async (req, res) => {
    const { isNewPatient, patientName, patientPhone, doctorId, serviceId, date, autoPassword, requestId } = req.body;
    try {
        await pool.query('BEGIN');
        let patientId;

        if (isNewPatient) {
            const hashedPassword = await bcrypt.hash(autoPassword, 10);
            const newUser = await pool.query(
                "INSERT INTO users (full_name, phone, role, password_hash) VALUES ($1, $2, 'patient', $3) RETURNING id",
                [patientName, patientPhone, hashedPassword]
            );
            patientId = newUser.rows[0].id;
            fs.appendFileSync('generated_passwords.txt', `Тел: ${patientPhone} | Пароль: ${autoPassword}\n`);
        } else {
            const user = await pool.query("SELECT id FROM users WHERE phone = $1", [patientPhone]);
            patientId = user.rows[0]?.id;
        }

        await pool.query(
            "INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_date, status) VALUES ($1, $2, $3, $4, 'planned')",
            [patientId, doctorId, serviceId, date]
        );

        if (requestId) {
            await pool.query("UPDATE appointment_requests SET status = 'approved', processed_at = CURRENT_TIMESTAMP WHERE id = $1", [requestId]);
        }

        await pool.query('COMMIT');

        // ТРИГЕР ТЕЛЕГРАМУ
        try {
            if (patientId) {
                const infoRes = await pool.query(`
                    SELECT p.telegram_chat_id, d.full_name as doc_name, s.title as service_title
                    FROM users p CROSS JOIN users d CROSS JOIN services s
                    WHERE p.id = $1 AND d.id = $2 AND s.id = $3
                `, [patientId, doctorId, serviceId]);

                if (infoRes.rows.length > 0 && infoRes.rows[0].telegram_chat_id) {
                    const info = infoRes.rows[0];
                    const formattedDate = new Date(date).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                    const msg = `📅 <b>Адміністратор записав вас на прийом!</b>\n\n👨‍⚕️ <b>Лікар:</b> ${info.doc_name}\n🦷 <b>Послуга:</b> ${info.service_title}\n⏰ <b>Час:</b> ${formattedDate}\n\nЧекаємо на вас у клініці OnyxDent! 🏥`;
                    await sendTelegramMessage(info.telegram_chat_id, msg);
                }
            }
        } catch (tgErr) { console.error(tgErr); }

        res.status(200).json({ message: "Візит створено успішно" });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ message: "Помилка сервера" });
    }
});

app.get('/api/admin/requests', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, s.title as service_title, u.id as registered_user_id
            FROM appointment_requests r 
            LEFT JOIN services s ON r.service_id = s.id 
            LEFT JOIN users u ON r.patient_phone = u.phone
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) { 
        console.error(err);
        res.status(500).send('Помилка завантаження заявок'); 
    }
});

app.delete('/api/admin/requests/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        await pool.query("DELETE FROM appointment_requests WHERE id = $1", [req.params.id]);
        res.sendStatus(200);
    } catch (err) { res.status(500).send("Помилка видалення"); }
});

app.get('/api/admin/appointments', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id, a.doctor_id, a.service_id, a.appointment_date, a.status, a.notes, a.patient_id,
                   u.full_name as patient_name, u.phone as patient_phone,
                   d.full_name as doctor_name, s.title as service_title
            FROM appointments a 
            JOIN users u ON a.patient_id = u.id 
            JOIN users d ON a.doctor_id = d.id
            JOIN services s ON a.service_id = s.id
            ORDER BY a.appointment_date ASC
        `);
        res.json(result.rows);
    } catch (err) { 
        console.error("Помилка /api/admin/appointments:", err.message);
        res.status(500).send('Помилка сервера'); 
    }
});

app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
    try {
        const doctorStats = await pool.query(`
            SELECT u.id, u.full_name, COUNT(a.id)::int as count
            FROM users u LEFT JOIN appointments a ON u.id = a.doctor_id
            WHERE u.role = 'doctor' GROUP BY u.id, u.full_name ORDER BY count DESC
        `);
        const serviceStats = await pool.query(`
            SELECT s.id, s.title, COUNT(a.id)::int as count
            FROM services s LEFT JOIN appointments a ON s.id = a.service_id
            GROUP BY s.id, s.title ORDER BY count DESC
        `);
        const totalPatients = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'patient'");
        const totalRevenue = await pool.query(`
            SELECT COALESCE(SUM(s.price), 0)::int as revenue FROM appointments a
            JOIN services s ON a.service_id = s.id WHERE a.status != 'cancelled'
        `);

        res.json({
            byDoctor: doctorStats.rows,
            byService: serviceStats.rows,
            totalPatients: totalPatients.rows[0].count,
            totalRevenue: totalRevenue.rows[0].revenue
        });
    } catch (err) {
        res.status(500).json({ error: "Помилка сервера" });
    }
});

app.delete('/api/admin/appointments/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const appInfoRes = await pool.query(`
            SELECT a.appointment_date, u.telegram_chat_id, s.title as service_title
            FROM appointments a JOIN users u ON a.patient_id = u.id
            JOIN services s ON a.service_id = s.id WHERE a.id = $1
        `, [id]);

        const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Прийом не знайдено" });

        try {
            if (appInfoRes.rows.length > 0 && appInfoRes.rows[0].telegram_chat_id) {
                const info = appInfoRes.rows[0];
                const formattedDate = new Date(info.appointment_date).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                const msg = `❌ <b>Ваш прийом скасовано</b>\n\nПовідомляємо, що ваш запис на послугу <b>"${info.service_title}"</b>, який мав відбутися <b>${formattedDate}</b>, скасовано адміністратором.`;
                await sendTelegramMessage(info.telegram_chat_id, msg);
            }
        } catch (tgErr) { console.error(tgErr); }

        res.json({ message: "Прийом успішно скасовано" });
    } catch (err) { res.status(500).json({ error: "Помилка сервера" }); }
});

app.get('/api/admin/notifications', verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT n.id, n.patient_id, n.type, n.appointment_id, n.status, u.full_name as patient_name, u.phone as patient_phone,
                   a.appointment_date, s.title as service_title
            FROM admin_notifications n JOIN users u ON n.patient_id = u.id
            LEFT JOIN appointments a ON n.appointment_id = a.id LEFT JOIN services s ON a.service_id = s.id
            WHERE n.status = 'pending' ORDER BY n.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Помилка сервера" }); }
});

app.delete('/api/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { notificationId } = req.body;
    try {
        await pool.query('BEGIN');
        await pool.query("UPDATE admin_notifications SET status = 'processed' WHERE id = $1", [notificationId]);
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        await pool.query('COMMIT');
        res.json({ message: "Користувача повністю видалено" });
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: "Помилка" }); }
});

app.delete('/api/admin/notifications/cancel-appointment/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { appointmentId } = req.body;
    try {
        await pool.query('BEGIN');
        await pool.query("UPDATE admin_notifications SET status = 'processed' WHERE id = $1", [id]);
        if (appointmentId) await pool.query("DELETE FROM appointments WHERE id = $1", [appointmentId]);
        await pool.query('COMMIT');
        res.json({ message: "Прийом успішно скасовано" });
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: "Помилка" }); }
});

app.post('/api/admin/add-doctor', verifyToken, requireAdmin, async (req, res) => {
    const { fullName, phone, specialization } = req.body;
    if (!fullName || !phone) return res.status(400).json({ message: "Будь ласка, заповніть усі обов'язкові поля" });

    try {
        await pool.query('BEGIN');
        const userCheck = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
        if (userCheck.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: "Користувач з таким номером телефону вже існує" });
        }

        const autoPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(autoPassword, 10);

        await pool.query(
            "INSERT INTO users (full_name, phone, password_hash, role, specialization) VALUES ($1, $2, $3, 'doctor', $4)",
            [fullName, phone, hashedPassword, specialization || 'Стоматолог']
        );

        const logLine = `Лікар: ${fullName} | Тел: ${phone} | Пароль: ${autoPassword}\n`;
        fs.appendFileSync(path.join(__dirname, 'generated_passwords.txt'), logLine);

        await pool.query('COMMIT');
        return res.status(201).json({ message: `Лікаря додано! Тимчасовий пароль: ${autoPassword}` });
    } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ message: "Помилка сервера" }); }
});

// Захищений адмінський ендпоінт
app.get('/api/admin/doctors', verifyToken, requireAdmin, async (req, res) => {
    try {
        // Запитуємо поля, підстраховуючись COALESCE на випадок відсутності значень
        const result = await pool.query("SELECT id, full_name, phone FROM users WHERE role = 'doctor'");
        res.json(result.rows);
    } catch (err) {
        console.error("Помилка сервера /api/admin/doctors:", err.message);
        res.status(500).json({ error: "Помилка сервера при завантаженні списку лікарів" });
    }
});
app.post('/api/admin/services', verifyToken, requireAdmin, async (req, res) => {
    const { title, price, duration_minutes } = req.body;
    if (!title || !price) return res.status(400).json({ error: "Назва та ціна є обов'язковими" });

    try {
        const result = await pool.query("INSERT INTO services (title, price, duration_minutes) VALUES ($1, $2, $3) RETURNING *", [title, price, duration_minutes || '']);
        res.status(201).json({ message: "Послугу додано", service: result.rows[0] });
    } catch (err) { res.status(500).json({ error: "Помилка" }); }
});

app.put('/api/admin/services/:id', verifyToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, price, duration_minutes } = req.body;
    try {
        const result = await pool.query("UPDATE services SET title = $1, price = $2, duration_minutes = $3 WHERE id = $4 RETURNING *", [title, price, duration_minutes, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Не знайдено" });
        res.json({ message: "Оновлено", service: result.rows[0] });
    } catch (err) { res.status(500).json({ error: "Помилка" }); }
});

// Ендпоінт створення нового адміністратора чинним адміністратором
app.post('/api/admin/add-admin', verifyToken, requireAdmin, async (req, res) => {
    const { fullName, phone } = req.body;

    if (!fullName || !phone) {
        return res.status(400).json({ message: "Будь ласка, заповніть усі обов'язкові поля" });
    }

    try {
        await pool.query('BEGIN');

        // Перевіряємо, чи немає користувача з таким номером телефону вже в базі
        const userCheck = await pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
        if (userCheck.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ message: "Користувач з таким номером телефону вже існує у системі" });
        }

        // Генеруємо випадковий пароль із 8 символів
        const autoPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(autoPassword, 10);

        // Вставляємо нового користувача з рольовою міткою 'admin'
        await pool.query(
            "INSERT INTO users (full_name, phone, password_hash, role) VALUES ($1, $2, $3, 'admin')",
            [fullName, phone, hashedPassword]
        );

        // Логуємо інформацію у файл для передачі облікових даних
        const logLine = `Адміністратор: ${fullName} | Тел: ${phone} | Пароль: ${autoPassword}\n`;
        fs.appendFileSync(path.join(__dirname, 'generated_passwords.txt'), logLine);

        await pool.query('COMMIT');
        
        return res.status(201).json({ 
            message: "Адміністратора успішно створено", 
            temporaryPassword: autoPassword 
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Помилка при створенні адміна:", err.message);
        res.status(500).json({ message: "Внутрішня помилка сервера при реєстрації адміністратора" });
    }
});

// Ендпоінт самостійного видалення акаунта адміністратора
app.delete('/api/admin/delete-me', verifyToken, requireAdmin, async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id; // Беремо ID з токена авторизації

    if (!password) {
        return res.status(400).json({ message: "Введіть пароль для підтвердження видалення" });
    }

    try {
        // 1. Отримуємо поточний хеш пароля з бази даних
        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(444).json({ message: "Користувача не знайдено" });
        }

        // 2. Перевіряємо пароль
        const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: "Невірний пароль! Спроба видалення відхилена" });
        }

        // 3. Перевіряємо, чи це не єдиний адмін у системі (опціональний захист системи)
        const adminCountRes = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        if (parseInt(adminCountRes.rows[0].count) <= 1) {
            return res.status(400).json({ message: "Неможливо видалити акаунт. Ви єдиний адміністратор у системі!" });
        }

        // 4. Видаляємо обліковий запис
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.json({ message: "Ваш обліковий запис успішно видалено" });
    } catch (err) {
        console.error("Помилка при самовидаленні адміна:", err.message);
        res.status(500).json({ message: "Внутрішня помилка сервера" });
    }
});

// --- ЗАГАЛЬНІ ЕНДПОЇНТИ ---
app.get('/api/services', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, title, price, duration_minutes FROM services ORDER BY title ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).send('Помилка сервера'); }
});


app.put('/api/user/change-password', verifyToken, async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    try {
        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const isMatch = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Невірний поточний пароль' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, userId]);
        res.json({ message: 'Пароль змінено успішно' });
    } catch (err) { res.status(500).send('Помилка'); }
});


// Автоматичне очищення заявок (24 год)
setInterval(async () => {
    await pool.query("DELETE FROM appointment_requests WHERE status = 'approved' AND processed_at < NOW() - INTERVAL '24 hours'");
}, 3600000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Сервер працює на порту ${PORT}`));