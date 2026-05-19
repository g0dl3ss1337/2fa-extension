# My 2FA Authenticator

**My 2FA Authenticator** is a browser extension that stores your 2FA secrets securely and generates one-time TOTP codes directly in the popup.

---

## 🎯 Key Benefits

- Fast access to 2FA codes without opening a separate app
- Secure access to 2FA codes with a master password
- Encrypted account storage in `chrome.storage.local`
- Temporary master password storage in `chrome.storage.session`
- Fast one-click copy of generated codes
- Add and remove accounts directly from the popup
- Clear visual timer for code refresh

---

## ✨ Preview Screenshots

### 1. First launch and master key creation
![First launch and master key creation](preview/preview_1.png)

The setup screen appears on first launch, prompting the user to create a master password.

### 2. Unlock screen
![Unlock screen](preview/preview_2.png)

Enter the master password to unlock previously saved accounts.

### 3. Empty state on first run
![Empty state on first run](preview/preview_3.png)

The main popup shows an empty state before any accounts are added.

### 4. Code display
![Code display](preview/preview_4.png)

View a generated TOTP code with the countdown timer.

### 5. Code interaction menu
![Code interaction menu](preview/preview_5.png)

Open the interaction menu to edit or delete a saved account.

### 6. Copied code state
![Copied code state](preview/preview_6.png)

The popup shows the state after copying a code to the clipboard.

---

## 🚀 What’s New in This Version

- Master password setup on first launch
- PBKDF2 + AES-GCM encryption for stored accounts
- Password unlock screen for returning users
- Lock button to hide codes and clear the session key
- Service worker background logic for secure session storage

---

## 🚀 How to Use

1. Open the extension popup.
2. On first run, create a master password.
3. Use the same password to unlock later.
4. Click `+` to add a new code.
5. Enter the service name and Base32 secret key.
6. Click `Save`.
7. Click any code to copy it to the clipboard.
8. Click the lock icon to lock the extension.

---

## 🧩 Implementation Highlights

- Data stored encrypted in `chrome.storage.local`
- Master password derived via PBKDF2 and used for AES-GCM
- Temporary session key stored in `chrome.storage.session`
- TOTP generation with `otplib-browser.js`
- Popup UI built with `popup.html`, `popup.css`, and `popup.js`

---

## ⚙️ Developer Installation

1. Open Chrome/Chromium.
2. Go to `chrome://extensions/`.
3. Enable Developer mode.
4. Click `Load unpacked`.
5. Select this project folder.

---

## 📁 Project Structure

- `manifest.json` — extension metadata, permissions, and service worker config
- `popup.html` — popup interface
- `popup.css` — popup styles
- `popup.js` — core logic for password setup, encryption, TOTP generation, and account management
- `otplib-browser.js` — TOTP library
- `background.js` — service worker handling session password storage
- `icons/` — extension icons
- `preview/` — screenshot folder
- `preview/preview_1.png`, `preview/preview_2.png`, `preview/preview_3.png`, `preview/preview_4.png`, `preview/preview_5.png`, `preview/preview_6.png` — interface previews

---

Create quick access to your 2FA codes and keep your secrets protected.

---

# My 2FA Authenticator

**My 2FA Authenticator** — это браузерное расширение, которое безопасно хранит ваши 2FA-секреты и генерирует одноразовые TOTP-коды прямо в popup.

---

## 🎯 Основные преимущества

- Быстрый доступ к 2FA-кодам без открытия отдельного приложения
- Безопасный доступ к 2FA-кодам через мастер-пароль
- Зашифрованное хранение аккаунтов в `chrome.storage.local`
- Временное хранение мастер-пароля в `chrome.storage.session`
- Быстрое копирование кода одним нажатием
- Добавление и удаление аккаунтов прямо из popup
- Наглядный таймер обновления кода

---

## ✨ Что видно на превью

### 1. Первый запуск и создание мастер-ключа
![Первый запуск и создание мастер-ключа](preview/preview_1.png)

Экран настройки появляется при первом запуске и предлагает создать мастер-пароль.

### 2. Окно ввода ключа для разблокировки
![Окно ввода ключа для разблокировки](preview/preview_2.png)

Введите мастер-пароль, чтобы разблокировать ранее сохранённые аккаунты.

### 3. Пустое окно при первом запуске
![Пустое окно при первом запуске](preview/preview_3.png)

Основное окно показывает пустое состояние до добавления аккаунтов.

### 4. Окно с кодом
![Окно с кодом](preview/preview_4.png)

Просмотрите сгенерированный TOTP-код с таймером обратного отсчёта.

### 5. Окно с кодом и меню взаимодействия
![Окно с кодом и меню взаимодействия](preview/preview_5.png)

Откройте меню взаимодействия, чтобы изменить или удалить сохранённый аккаунт.

### 6. Состояние после копирования кода
![Состояние после копирования кода](preview/preview_6.png)

Окно показывает состояние после копирования кода в буфер обмена.

---

## 🚀 Новинки в этой версии

- Создание мастер-пароля при первом запуске
- Шифрование аккаунтов через PBKDF2 + AES-GCM
- Экран разблокировки для повторных запусков
- Кнопка блокировки для скрытия кодов и очистки сессии
- Фоновый service worker для безопасного хранения пароля в сессии

---

## 🚀 Как пользоваться

1. Откройте popup расширения.
2. При первом запуске создайте мастер-пароль.
3. Вводите пароль для последующей разблокировки.
4. Нажмите `+`, чтобы добавить новый код.
5. Укажите название сервиса и секретный ключ в формате Base32.
6. Нажмите `Save`.
7. Нажмите на любой код, чтобы скопировать его.
8. Нажмите значок замка, чтобы заблокировать расширение.

---

## 🧩 Особенности реализации

- Данные хранятся зашифрованными в `chrome.storage.local`
- Мастер-пароль выводится через PBKDF2 и используется для AES-GCM
- Временный ключ хранится в `chrome.storage.session`
- Генерация TOTP выполняется через `otplib-browser.js`
- UI popup реализован в `popup.html`, `popup.css` и `popup.js`

---

## ⚙️ Установка для разработчика

1. Откройте Chrome/Chromium.
2. Перейдите на `chrome://extensions/`.
3. Включите режим разработчика.
4. Нажмите `Загрузить распакованное расширение`.
5. Выберите папку этого проекта.

---

## 📁 Состав проекта

- `manifest.json` — метаданные расширения, разрешения и конфигурация сервис-воркера
- `popup.html` — интерфейс popup
- `popup.css` — стили popup
- `popup.js` — логика мастер-пароля, шифрования, генерации TOTP и управления аккаунтами
- `otplib-browser.js` — библиотека TOTP
- `background.js` — сервис-воркер для хранения пароля в сессии
- `icons/` — иконки расширения
- `preview/` — папка со скриншотами
- `preview/preview_1.png`, `preview/preview_2.png`, `preview/preview_3.png`, `preview/preview_4.png`, `preview/preview_5.png`, `preview/preview_6.png` — превью интерфейса

---

Создавайте быстрый доступ к 2FA-кодам и храните секреты под защитой.
