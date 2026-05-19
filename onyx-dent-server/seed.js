const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function seedDatabase() {
    try {
        const saltRounds = 10;
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        console.log("🚀 Початок наповнення БД...");

        // 1. Додавання послуг[cite: 15, 16]
        const serviceQueries = [
            ['Консультація', 'Первинний огляд та план лікування', 300, 30],
            ['Терапія', 'Лікування карієсу', 800, 60],
            ['Професійна гігієна', 'Чистка Air Flow', 1200, 45],
            ['Імплантація', 'Встановлення імпланту', 15000, 120]
        ];

        for (const s of serviceQueries) {
            await pool.query(
                'INSERT INTO services (title, description, price, duration_minutes) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                s
            );
        }
        console.log("✅ Послуги додано");

        // 2. Додавання основних користувачів[cite: 10, 15]
        // Формат: [phone, email, password_hash, full_name, role]
        const users = [
            ['+380968208914', 'admin@onyx.com', hashedPassword, 'Головний Адміністратор', 'admin'],
            ['+380671112233', 'doctor@onyx.com', hashedPassword, 'Олександр Оникс', 'doctor'],
            ['+380501234567', 'patient@onyx.com', hashedPassword, 'Іван Іваненко', 'patient']
        ];

        for (const u of users) {
            await pool.query(
                `INSERT INTO users (phone, email, password_hash, full_name, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name`,
                u
            );
        }
        console.log("✅ Користувачі (Адмін, Лікар, Пацієнт) додані");

        // 3. Додавання тестового розкладу для лікаря[cite: 16]
        await pool.query(
            `INSERT INTO doctor_schedule (doctor_id, work_date, start_time, end_time)
             SELECT id, CURRENT_DATE, '09:00', '18:00' FROM users WHERE role = 'doctor' LIMIT 1
             ON CONFLICT DO NOTHING`
        );
        console.log("✅ Початковий розклад створено");

    } catch (err) {
        console.error("❌ Помилка при наповненні:", err.message);
    } finally {
        await pool.end();
        console.log("🏁 Процес завершено.");
    }
}

seedDatabase();