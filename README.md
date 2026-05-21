# [EN] My 2FA Authenticator

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
<p align="center"><img src="preview/preview_1.png" alt="First launch and master key creation" /></p>

The setup screen appears on first launch, prompting the user to create a master password.

### 1.1 Password strength indicators

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_1_1.png" alt="Weak master key demonstration" width="180" /><br>Weak</td>
    <td align="center"><img src="preview/preview_1_2.png" alt="Fair master key demonstration" width="180" /><br>Fair</td>
    <td align="center"><img src="preview/preview_1_3.png" alt="Good master key demonstration" width="180" /><br>Good</td>
    <td align="center"><img src="preview/preview_1_4.png" alt="Strong master key demonstration" width="180" /><br>Strong</td>
    <td align="center"><img src="preview/preview_1_5.png" alt="Strong master key confirmation" width="180" /><br>Very Strong</td>
  </tr>
</table>

Password strength is shown from weak to strong during master key creation.

### 2. Unlock screen
<p align="center"><img src="preview/preview_2.png" alt="Unlock screen" /></p>

Enter the master password to unlock previously saved accounts.

### 3. First launch and empty state
<p align="center"><img src="preview/preview_3.png" alt="First launch and empty state" /></p>

The main popup shows an empty state before any accounts are added.

### 4. Add code screens

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_4.png" alt="Add code screen" width="240" /><br>Add code screen</td>
    <td align="center"><img src="preview/preview_4_1.png" alt="Add code screen advanced" width="240" /><br>Add code screen with advanced open</td>
  </tr>
</table>

Add a new account with a simple code entry screen and an advanced settings panel.

### 5. Code view screens

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_5.png" alt="Code view without interaction menu" width="240" /><br>Code view without interaction menu</td>
    <td align="center"><img src="preview/preview_5_1.png" alt="Code view with interaction menu" width="240" /><br>Code view with interaction menu</td>
  </tr>
</table>

View a generated TOTP code and manage it with edit/delete actions.

### 6. Copied code state
<p align="center"><img src="preview/preview_6.png" alt="Copied code state" /></p>

The popup shows the state after copying a code to the clipboard.

### 7. Search open
<p align="center"><img src="preview/preview_7.png" alt="Search open" /></p>

Search across saved codes in the popup.

### 8. Settings with themes

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_8.png" alt="Settings original theme" width="240" /><br>Original theme</td>
    <td align="center"><img src="preview/preview_8_1.png" alt="Settings OLED Black theme" width="240" /><br>OLED Black theme</td>
    <td align="center"><img src="preview/preview_8_2.png" alt="Settings White theme" width="240" /><br>White theme</td>
  </tr>
</table>

---

## 🚀 What’s New in This Version

- Master password setup on first launch
- Password strength feedback while creating your master key
- PBKDF2 + AES-GCM encryption for stored accounts
- Unlock screen for returning users
- Lock button to hide codes and clear the session key
- Search across saved codes and interactive edit/delete menu
- Add code flow with optional advanced settings
- Theme selection plus export/import settings
- OLED Black and White theme support
- Background service worker for secure session handling

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


---

Create quick access to your 2FA codes and keep your secrets protected.

---

# [RU] My 2FA Authenticator

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
<p align="center"><img src="preview/preview_1.png" alt="Первый запуск и создание мастер-ключа" /></p>

Экран настройки появляется при первом запуске и предлагает создать мастер-пароль.

### 1.1 Индикаторы силы пароля

<table>
  <tr>
    <td align="center"><img src="preview/preview_1_1.png" alt="Демонстрация мастера ключа weak уровня" width="180" /><br>Weak</td>
    <td align="center"><img src="preview/preview_1_2.png" alt="Демонстрация мастера ключа fair уровня" width="180" /><br>Fair</td>
    <td align="center"><img src="preview/preview_1_3.png" alt="Демонстрация мастера ключа good уровня" width="180" /><br>Good</td>
    <td align="center"><img src="preview/preview_1_4.png" alt="Демонстрация мастера ключа strong уровня" width="180" /><br>Strong</td>
    <td align="center"><img src="preview/preview_1_5.png" alt="Демонстрация мастера ключа strong уровня" width="180" /><br>Very Strong</td>
  </tr>
</table>

Показана сила пароля от weak до strong при создании мастер-ключа.

### 2. Окно ввода ключа для разблокировки
<p align="center"><img src="preview/preview_2.png" alt="Окно ввода ключа для разблокировки" /></p>

Введите мастер-пароль, чтобы разблокировать ранее сохранённые аккаунты.

### 3. Первый запуск, и пустое окно без кодов
<p align="center"><img src="preview/preview_3.png" alt="Первый запуск, и пустое окно без кодов" /></p>

Основное окно показывает пустое состояние до добавления аккаунтов.

### 4. Окна добавления кода

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_4.png" alt="Окно с добавлением кода" width="240" /><br>Окно с добавлением кода</td>
    <td align="center"><img src="preview/preview_4_1.png" alt="Окно с добавлением кода advanced" width="240" /><br>Окно с добавлением кода с открытым advanced</td>
  </tr>
</table>

Добавление нового аккаунта на простом экране ввода и через расширенные настройки.

### 5. Окна просмотра кода

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_5.png" alt="Окно с кодом без открытого меню взаимодействия" width="240" /><br>Окно с кодом без открытого меню</td>
    <td align="center"><img src="preview/preview_5_1.png" alt="Окно с кодом и открытым меню взаимодействия" width="240" /><br>Окно с кодом и открытым меню взаимодействия</td>
  </tr>
</table>

Просмотр кода с возможностью редактирования и удаления.

### 6. Окно с тем как выглядит когда скопировал код
<p align="center"><img src="preview/preview_6.png" alt="Окно с тем как выглядит когда скопировал код" /></p>

Состояние после копирования кода в буфер обмена.

### 7. Окно с открытым поиском по кодам
<p align="center"><img src="preview/preview_7.png" alt="Окно с открытым поиском по кодам" /></p>

Поиск по сохранённым кодам в popup.

### 8. Окно с настройками и темами

<table align="center" style="margin: 0 auto;">
  <tr>
    <td align="center"><img src="preview/preview_8.png" alt="Оригинальная тема" width="240" /><br>Оригинальная тема</td>
    <td align="center"><img src="preview/preview_8_1.png" alt="OLED Black тема" width="240" /><br>OLED Black тема</td>
    <td align="center"><img src="preview/preview_8_2.png" alt="White тема" width="240" /><br>White тема</td>
  </tr>
</table>

---

## 🚀 Новинки в этой версии

- Создание мастер-пароля при первом запуске
- Индикатор силы пароля во время настройки
- Шифрование аккаунтов PBKDF2 + AES-GCM
- Экран разблокировки для возвращающихся пользователей
- Кнопка блокировки, скрывающая коды и очищающая сессионный ключ
- Поиск по кодам и меню редактирования/удаления
- Добавление кода с опциональной вкладкой advanced
- Выбор темы и импорт/экспорт настроек
- Темы OLED Black и White
- Фоновый service worker для безопасной сессии

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

---

Создавайте быстрый доступ к вашим 2FA-кодам и храните секреты под защитой.
