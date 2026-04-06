# Универсальная инструкция: Telegram-бот с AI-генерацией по фото-референсу

Пошаговое руководство по созданию Telegram-бота, который принимает фотографию объекта, собирает параметры через анкету, генерирует варианты изображений и текстов, и публикует результат в канал.

Инструкция написана на основе реального проекта **Pet BOT** (пристройство животных) и адаптируется под любую сферу.

---

## Оглавление

1. [Паттерн и архитектура](#1-паттерн-и-архитектура)
2. [Примеры доменов](#2-примеры-доменов)
3. [Структура проекта](#3-структура-проекта)
4. [Пошаговое создание](#4-пошаговое-создание)
5. [Адаптация под свой домен](#5-адаптация-под-свой-домен)
6. [Промпт-инжиниринг](#6-промпт-инжиниринг)
7. [Публикация в канал](#7-публикация-в-канал)
8. [Чеклист запуска](#8-чеклист-запуска)

---

## 1. Паттерн и архитектура

Все проекты этого типа следуют одному конвейеру:

```
Фото-референс --> Анкета (FSM) --> Параллельная генерация --> Выбор --> Публикация
                                    /                \
                           Изображения            Тексты
                        (OpenAI Images)       (OpenAI Chat)
```

### Ключевые принципы

- **Фото как якорь идентичности.** Модель получает референсное фото и должна сохранить ключевые визуальные признаки объекта (текстура ткани, морда животного, фасад здания).
- **Анкета определяет контекст.** Параметры из анкеты формируют промпт: что именно генерировать вокруг объекта.
- **Параллельная генерация.** Изображения и тексты генерируются одновременно через `asyncio.gather()` — это экономит время ожидания.
- **Выбор и редактирование.** Пользователь выбирает лучшие варианты и может отредактировать текст перед публикацией.
- **Публикация в канал.** Готовый результат отправляется в отдельный Telegram-канал с кнопками обратной связи.

### Стек

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| Telegram API | aiogram 3.x | Бот, FSM, inline-кнопки |
| Генерация изображений | OpenAI Images API (`gpt-image-1`) | Identity-preserving edit по референсу |
| Генерация текстов | OpenAI Chat API (`gpt-4o-mini`) | Копирайтинг по параметрам анкеты |
| Обработка изображений | Pillow | Нормализация, кроп, оверлей текста |
| Конфигурация | python-dotenv | Секреты из `.env` |

---

## 2. Примеры доменов

### Мода / ткани
- **Вход:** фото ткани (отрез, образец)
- **Анкета:** тип одежды (платье/юбка/рубашка), силуэт, сезон, стиль (casual/formal/street)
- **Генерация изображений:** девушка/модель в одежде из этой ткани, в подходящем окружении
- **Генерация текстов:** описание для маркетплейса или Instagram

### Мебельные ткани
- **Вход:** фото мебельной ткани (обивочный материал)
- **Анкета:** тип мебели (диван/кресло/стул), стиль интерьера, цветовая гамма комнаты
- **Генерация изображений:** мебель с этой обивкой в интерьере
- **Генерация текстов:** описание для каталога или сайта

### Недвижимость
- **Вход:** фото квартиры/комнаты (пустой или с ремонтом)
- **Анкета:** тип помещения, стиль ремонта, бюджет, площадь
- **Генерация изображений:** варианты дизайна интерьера на основе реальной комнаты
- **Генерация текстов:** объявление для продажи/аренды

### Еда / ресторан
- **Вход:** фото блюда
- **Анкета:** кухня, тип подачи, целевая аудитория, ценовой сегмент
- **Генерация изображений:** блюдо в ресторанной сервировке, food-photography стиль
- **Генерация текстов:** описание для меню или доставки

### Хендмейд / ремесло
- **Вход:** фото изделия (керамика, украшение, вязание)
- **Анкета:** материал, техника, назначение, стиль
- **Генерация изображений:** изделие в lifestyle-контексте (на столе, на модели, в интерьере)
- **Генерация текстов:** описание для Etsy, Instagram, ярмарки

---

## 3. Структура проекта

```
my_bot/
├── bot.py                 # Точка входа, FSM, хендлеры, публикация
├── image_service.py       # Подготовка референсов и генерация изображений
├── text_service.py        # Построение профиля и генерация текстов
├── config.py              # Загрузка переменных окружения
├── .env                   # Секреты (НЕ коммитить)
├── .gitignore
└── requirements.txt
```

**Принцип четырёх модулей:**

- `config.py` — единственное место, где читается `.env`
- `image_service.py` — знает только про изображения, не знает про Telegram
- `text_service.py` — знает только про тексты, не знает про Telegram
- `bot.py` — оркестрирует всё: FSM, вызов сервисов, отправка результатов

---

## 4. Пошаговое создание

### Шаг 1: Инициализация проекта

```bash
mkdir my_bot && cd my_bot
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
# .venv\Scripts\activate         # Windows
pip install aiogram openai Pillow python-dotenv
pip freeze > requirements.txt
```

### Шаг 2: Конфигурация (`config.py`)

```python
import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "")

if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN не задан в .env")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY не задан в .env")
```

Добавь сюда любые дополнительные переменные для своего домена (контактные данные, ссылки, ID каналов).

### Шаг 3: Сервис изображений (`image_service.py`)

Три главные функции:

```python
# 1. Нормализация входного фото
def _normalize_image(photo_bytes: bytes, max_size: int = 768) -> Image.Image:
    """EXIF-транспонирование + уменьшение до безопасного размера."""

# 2. Подготовка референсов
def _build_reference_images(photo_bytes: bytes) -> list[tuple[str, bytes, str]]:
    """Из одного фото делает 2 референса: полный кадр + focus crop."""

# 3. Генерация
async def generate_images(photo_bytes: bytes, form_data: dict, count: int = 3) -> list[bytes]:
    """Вызывает OpenAI images.edit() с fallback-цепочкой."""
```

**Fallback-цепочка** — ключевой паттерн для надёжности:

```python
variants = [
    {"image": references,    "input_fidelity": "high", "quality": "medium"},  # Лучшее
    {"image": references[0], "input_fidelity": "high", "quality": "medium"},  # Один референс
    {"image": references[0], "input_fidelity": "high", "quality": "low"},     # Легче
    {"image": references[0], "input_fidelity": "low",  "quality": "medium"},  # Самый лёгкий
]
# Пробуем от лучшего к лёгкому, пока не получим результат
```

### Шаг 4: Сервис текстов (`text_service.py`)

Две главные функции:

```python
# 1. Профиль объекта из данных анкеты
def _build_profile(data: dict) -> str:
    """Превращает dict из FSM в читаемый текст для промпта."""

# 2. Генерация текстов
async def generate_texts(form_data: dict, count: int = 5) -> list[str]:
    """Вызывает gpt-4o-mini и разбирает ответ на отдельные тексты."""
```

**Устойчивый парсинг ответа** — модель не всегда следует формату:

```python
def _split_generated_texts(raw_text: str) -> list[str]:
    # Стратегия 1: разделитель ---
    # Стратегия 2: нумерация (1. 2. 3.)
    # Стратегия 3: двойные переносы строк
    # Fallback: весь текст как один вариант
```

### Шаг 5: Telegram-бот (`bot.py`)

#### FSM-состояния

Определи линейную цепочку состояний анкеты:

```python
class Form(StatesGroup):
    photo = State()           # Ожидание фото
    # ... состояния анкеты (зависят от домена) ...
    result = State()          # Показ результатов
    edit_text = State()       # Редактирование текста
```

#### Шаблон хендлера для кнопки анкеты

```python
@dp.callback_query(Form.some_state, F.data.in_({"option_a", "option_b"}))
async def handle_some_step(call: CallbackQuery, state: FSMContext):
    await state.update_data(field_name=call.data)
    await state.set_state(Form.next_state)
    await call.message.edit_text(
        "Следующий вопрос?",
        reply_markup=kb([("Вариант A", "option_a"), ("Вариант B", "option_b")]),
    )
```

#### Генерация и показ результатов

```python
@dp.callback_query(F.data == "generate")
async def handle_generate(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    # Параллельная генерация
    images, texts = await asyncio.gather(
        generate_images(data["photo_bytes"], data, count=3),
        generate_texts(data, count=5),
    )
    # Отправка фото с кнопками выбора
    for i, img in enumerate(images):
        await call.message.answer_photo(
            BufferedInputFile(img, filename=f"result_{i}.png"),
            reply_markup=photo_pick_kb(i),
        )
    # Отправка текстов с кнопками выбора и редактирования
    for i, text in enumerate(texts):
        await call.message.answer(text, reply_markup=text_option_kb(i))
```

### Шаг 6: Хранение сессий

Для переживания рестарта без базы данных:

```python
# Сохранение последней анкеты пользователя в JSON
# photo_bytes кодируется в base64
def _save_latest_sessions() -> None:
    serializable = {}
    for user_id, payload in latest_sessions.items():
        session = dict(payload)
        if isinstance(session.get("photo_bytes"), bytes):
            session["photo_bytes"] = base64.b64encode(session["photo_bytes"]).decode()
        serializable[str(user_id)] = session
    Path("latest_sessions.json").write_text(json.dumps(serializable))
```

---

## 5. Адаптация под свой домен

Чтобы переделать бота под новую сферу, нужно изменить **5 вещей**:

### 5.1. Состояния FSM (анкета)

Замени вопросы анкеты на релевантные для твоего домена.

| Pet BOT | Мода / ткани | Мебельные ткани |
|---------|-------------|-----------------|
| animal_type (кошка/собака) | garment_type (платье/юбка/рубашка) | furniture_type (диван/кресло/стул) |
| sex (самец/самка) | silhouette (прямой/приталенный/свободный) | style (модерн/классика/лофт) |
| age | season (весна-лето/осень-зима) | room (гостиная/спальня/кабинет) |
| size | style (casual/formal/street) | color_scheme (светлая/тёмная/нейтральная) |
| character | — | — |
| health | — | — |

### 5.2. Словари-маппинги

В `text_service.py` и `image_service.py` замени словари callback -> человекочитаемый текст:

```python
# Pet BOT
ANIMAL_NAMES = {"cat": "кошка", "dog": "собака"}

# Мода
GARMENT_NAMES = {"dress": "платье", "skirt": "юбка", "shirt": "рубашка", "coat": "пальто"}

# Мебель
FURNITURE_NAMES = {"sofa": "диван", "armchair": "кресло", "chair": "стул", "ottoman": "пуф"}
```

### 5.3. Промпт для изображений

В `image_service.py` замени функцию `_build_prompt()`. Это самая важная часть адаптации — см. раздел [Промпт-инжиниринг](#6-промпт-инжиниринг).

### 5.4. Промпт для текстов

В `text_service.py` замени системный промпт и роль модели:

```python
# Pet BOT
"Ты — копирайтер волонтёрской организации по пристройке животных."

# Мода
"Ты — fashion-копирайтер. Пишешь описания одежды для маркетплейса."

# Мебель
"Ты — копирайтер мебельного каталога. Пишешь описания для интернет-магазина."
```

### 5.5. Оверлей на фото и формат публикации

В `bot.py` замени:
- `_build_photo_overlay_text()` — какие атрибуты показывать поверх фото
- `_build_channel_post_text()` — формат поста в канале
- Inline-кнопки под постом (например, `"Купить"` вместо `"Помочь"`)

---

## 6. Промпт-инжиниринг

### Промпт для изображений: структура

Каждый промпт для `images.edit()` должен содержать 5 блоков:

```
1. ЯКОРЬ ИДЕНТИЧНОСТИ — что именно сохранить из референса
2. ОБЪЕКТ — что мы создаём
3. КОНТЕКСТ / ФОН — где объект находится
4. КОМПОЗИЦИЯ — ракурс, расстояние до камеры
5. ОГРАНИЧЕНИЯ — что запрещено (артефакты, текст, дубли)
```

### Примеры промптов по доменам

#### Pet BOT (текущий)
```
1. Preserve the exact face, muzzle, fur pattern, markings, coat color, and identity.
2. The pet is one medium-sized cat with a calm vibe.
3. Place the pet in a cozy Scandinavian living room.
4. A clean medium portrait with the full head and upper body visible.
5. No text, no watermark, no extra animals, no blur.
```

#### Мода / ткани
```
1. Use the uploaded fabric reference as the EXACT material for the garment.
   Preserve the texture, pattern, weave, color, and sheen of the fabric precisely.
2. Show a female model wearing a fitted midi dress made entirely from this fabric.
3. Place the model in a bright fashion-editorial setting with a clean neutral background.
4. A full-body fashion shot with natural pose, the dress fully visible.
5. No text, no watermark, no collage. Only one person. Show realistic fabric drape and folds.
```

#### Мебельные ткани
```
1. Use the uploaded upholstery fabric reference as the EXACT cover material.
   Preserve the texture, pattern, color, and surface quality precisely.
2. Show a modern three-seat sofa fully upholstered in this fabric.
3. Place the sofa in a bright Scandinavian living room with natural daylight.
4. A wide interior shot with the sofa as the focal point, occupying about 40% of the frame.
5. No text, no watermark. Show realistic fabric stretching and cushion creases.
```

#### Недвижимость
```
1. Use the uploaded room photo as the EXACT space layout.
   Preserve the room dimensions, window positions, and floor plan.
2. Show a fully furnished and decorated version of this room in modern minimalist style.
3. The room should feel bright, clean, and move-in ready.
4. Same camera angle as the reference photo.
5. No text, no watermark, no people. Realistic lighting matching the window positions.
```

### Промпт для текстов: структура

```python
prompt = (
    f"Ты — {РОЛЬ}. "
    f"Напиши {count} разных текстов {ТИП_ТЕКСТА}. "
    f"Каждый текст — {ДЛИНА} в разном стиле: {СТИЛИ}.\n\n"
    f"Данные:\n{profile}\n"
    "Требования:\n"
    "- Тексты на русском языке\n"
    "- Каждый текст отделяй строкой '---'\n"
    "- Не нумеруй тексты\n"
    f"- {СПЕЦИФИЧЕСКОЕ_ТРЕБОВАНИЕ}"
)
```

| Домен | РОЛЬ | ТИП_ТЕКСТА | СТИЛИ |
|-------|------|-----------|-------|
| Питомцы | копирайтер волонтёрской организации | объявлений для поиска хозяина | трогательный, позитивный, информативный, душевный, с юмором |
| Мода | fashion-копирайтер | описаний товара для маркетплейса | лаконичный, эмоциональный, технический, lifestyle, storytelling |
| Мебель | интерьерный копирайтер | описаний для каталога | премиальный, практичный, вдохновляющий, уютный |
| Недвижимость | риелтор-копирайтер | объявлений для продажи/аренды | деловой, эмоциональный, подробный, краткий |

---

## 7. Публикация в канал

### Формат поста

Универсальный формат публикации:

```
[Медиа: 1-4 фото с текстовым оверлеем атрибутов]

Заголовок №N

Текст описания

[Inline-кнопка действия]
```

### Что адаптировать

| Элемент | Pet BOT | Мода | Мебель |
|---------|---------|------|--------|
| Оверлей на фото | Кличка, возраст, размер, характер, здоровье | Тип, размер, ткань, сезон | Тип, размер, стиль, материал |
| Заголовок | `Мурзик №12` | `Платье из шёлка №12` | `Диван "Скандинавия" №12` |
| Кнопка | "Помочь" (popup с контактами) | "Купить" (ссылка) | "Заказать" (ссылка) |
| Номерация | Сквозной счётчик из файла | Артикул / SKU | Артикул / SKU |

### Оверлей текста на фото

Алгоритм выбора цвета текста:
1. Вырезать правую нижнюю четверть изображения (там будет текст)
2. Перевести в grayscale и посчитать среднюю яркость
3. Если яркость >= 145: белый текст + тёмная обводка
4. Если яркость < 145: тёмный текст + светлая обводка

```python
sample_region = image.crop((w * 0.48, h * 0.62, w, h)).convert("L")
brightness = ImageStat.Stat(sample_region).mean[0]
```

---

## 8. Чеклист запуска

### Перед написанием кода

- [ ] Создать бота через @BotFather, получить токен
- [ ] Получить OpenAI API key
- [ ] Создать Telegram-канал для публикации
- [ ] Добавить бота в канал как администратора с правом публикации
- [ ] Получить `chat_id` канала (числовой, вида `-100...`)

### Файлы проекта

- [ ] `config.py` — все переменные окружения
- [ ] `image_service.py` — промпт и референсы для своего домена
- [ ] `text_service.py` — роль, профиль, стили для своего домена
- [ ] `bot.py` — FSM-состояния, хендлеры, формат публикации
- [ ] `.env` — заполнить токены и ID
- [ ] `.gitignore` — включить `.env`, `latest_sessions.json`, `__pycache__/`, `*.pyc`
- [ ] `requirements.txt` — `aiogram`, `openai`, `Pillow`, `python-dotenv`

### Перед продакшеном

- [ ] Проверить, что `.env` не попадёт в git
- [ ] Протестировать полный цикл: фото -> анкета -> генерация -> выбор -> публикация
- [ ] Проверить fallback-цепочку (отключить сеть и проверить graceful degradation)
- [ ] Добавить rate-limiting или whitelist, если бот публичный
- [ ] Проверить, что `latest_sessions.json` корректно восстанавливается после рестарта

---

## Быстрый старт: минимальные изменения для нового домена

Если нужно запустить бота для нового домена за минимальное время:

1. **Скопируй проект целиком**
2. **Замени FSM-состояния** в `bot.py` (вопросы анкеты)
3. **Замени словари** в `text_service.py` и `image_service.py`
4. **Замени `_build_prompt()`** в `image_service.py` (промпт для изображений)
5. **Замени системный промпт** в `text_service.py` (роль и стили)
6. **Замени оверлей и формат поста** в `bot.py`
7. **Заполни `.env`** новыми токенами и ID канала
8. **Запусти** `python bot.py`

Всё остальное (FSM-машина, параллельная генерация, fallback, выбор/редактирование, публикация) работает одинаково для любого домена.
