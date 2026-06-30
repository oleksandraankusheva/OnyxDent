# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# OnyxDent — Система управління стоматологічною клінікою

Сучасна full-stack вебплатформа для автоматизації внутрішніх процесів стоматологічної клініки та забезпечення зручного взаємозв'язку між пацієнтами, лікарями та адміністрацією.

### Ролі в системі та їх функціонал:

* **Кабінет Пацієнта (Patient Account):**
  * Перегляд та запис на прийом (із вибором послуги, дати та лікаря).
  * Доступ до особистої електронної медичної карти.
  * Налаштування профілю та зміна пароля.
* **Кабінет Лікаря (Doctor Account):**
  * Зручний календарний графік прийомів (Calendar View) та список актуальних записів.
  * Ведення медичних карток пацієнтів та перегляд історії хвороб.
  * Індивідуальні налаштування робочого профілю.
* **Панель Адміністратора (Admin Account):**
  * Керування графіком роботи всієї клініки (Clinic Schedule).
  * Менеджмент персоналу: додавання, редагування та видалення профілів лікарів.
  * Управління каталогом послуг та прайс-листом (Service List).
  * Перегляд статистики роботи клініки та обробка системних запитів.

### Додаткові модулі:
* **Вбудований Чат (Chat):** Модуль для швидкої комунікації та обміну повідомленнями.
* **Telegram Bot:** Інтеграція з ботом за допомогою QR-коду для оперативного інформування.

### Технологічний стек:
* **Frontend:** React, Vite, JavaScript (JSX), CSS3 (адаптивний інтерфейс).
* **Backend:** Node.js (Express)
* **Збірка та лінтинг:** Vite, ESLint.
