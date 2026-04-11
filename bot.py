import asyncio
import base64
from contextlib import suppress
import json
import logging
import os
from io import BytesIO
from pathlib import Path

from aiogram import Bot, Dispatcher, F
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    Message,
)

from config import (
    BOT_DATA_DIR,
    CARD_NUMBER,
    CONTACT_PHONE,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_SPECIAL_CHANNEL_ID,
)
from image_service import generate_images
from PIL import Image, ImageDraw, ImageFont, ImageStat
from text_service import (
    generate_texts,
    get_profile_labels,
)

logging.basicConfig(level=logging.INFO)

bot = Bot(token=TELEGRAM_BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())
latest_sessions: dict[int, dict] = {}
latest_generated: dict[int, dict] = {}
generation_expiry_tasks: dict[int, asyncio.Task] = {}
BOT_DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_FILE = BOT_DATA_DIR / "latest_sessions.json"
PET_COUNTER_FILE = BOT_DATA_DIR / "pet_counter.txt"
GENERATION_TTL_SECONDS = 5 * 60
LOADING_FRAME_DELAY_SECONDS = 0.8
START_PROMPT_TEXT = (
    "Привет! Я помогу создать красивое объявление для пристройки питомца.\n\n"
    "Пришлите фото животного — кошки или собаки.\n"
    "Отправьте его через галерею или скрепку в Telegram."
)
GENERATION_EXPIRED_TEXT = (
    "Прошло 5 минут после генерации. Текущая подборка очищена, чтобы не работать "
    "с устаревшими вариантами.\n\n"
    "Пришлите новое фото животного, чтобы начать заново."
)
LOADING_FRAMES = (
    "Магия 🪄🧚.",
    "Магия 🪄🧚..",
    "Магия 🪄🧚...",
    "Магия 🪄🧚....",
    "Магия 🪄🧚.....",
)


class Form(StatesGroup):
    photo = State()
    name = State()
    animal_type = State()
    sex = State()
    age = State()
    size = State()
    character = State()
    health = State()
    comments = State()
    result = State()
    edit_text = State()


def kb(buttons: list[tuple[str, str]]) -> InlineKeyboardMarkup:
    """Строит InlineKeyboardMarkup из списка (текст, callback_data)."""
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=t, callback_data=d)] for t, d in buttons]
    )


def _load_latest_sessions() -> dict[int, dict]:
    if not SESSIONS_FILE.exists():
        return {}

    try:
        raw_data = json.loads(SESSIONS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logging.exception("Не удалось загрузить latest_sessions.json")
        return {}

    sessions: dict[int, dict] = {}
    for user_id, payload in raw_data.items():
        try:
            session = dict(payload)
            photo_b64 = session.get("photo_bytes")
            if photo_b64:
                session["photo_bytes"] = base64.b64decode(photo_b64)
            sessions[int(user_id)] = session
        except Exception:
            logging.exception("Не удалось восстановить сессию пользователя %s", user_id)
    return sessions


def _save_latest_sessions() -> None:
    serializable: dict[str, dict] = {}
    for user_id, payload in latest_sessions.items():
        session = dict(payload)
        photo_bytes = session.get("photo_bytes", b"")
        if isinstance(photo_bytes, bytes):
            session["photo_bytes"] = base64.b64encode(photo_bytes).decode("ascii")
        serializable[str(user_id)] = session

    try:
        SESSIONS_FILE.write_text(
            json.dumps(serializable, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError:
        logging.exception("Не удалось сохранить latest_sessions.json")


def _set_latest_session(user_id: int, data: dict) -> None:
    latest_sessions[user_id] = dict(data)
    _save_latest_sessions()


def _get_latest_session(user_id: int) -> dict:
    return latest_sessions.get(user_id, {}).copy()


def _drop_latest_session(user_id: int) -> None:
    if latest_sessions.pop(user_id, None) is not None:
        _save_latest_sessions()


def _has_pending_name_step(session: dict) -> bool:
    return isinstance(session.get("photo_bytes"), bytes) and not session.get("animal_type")


def _cancel_generation_expiry(user_id: int) -> None:
    task = generation_expiry_tasks.pop(user_id, None)
    if task and not task.done():
        task.cancel()


async def _reset_user_flow(
    user_id: int,
    state: FSMContext,
    *,
    cancel_expiry: bool = True,
) -> None:
    if cancel_expiry:
        _cancel_generation_expiry(user_id)

    latest_generated.pop(user_id, None)
    _drop_latest_session(user_id)
    await state.clear()
    await state.set_state(Form.photo)


async def _expire_generated_results(user_id: int) -> None:
    try:
        await asyncio.sleep(GENERATION_TTL_SECONDS)
        state = dp.fsm.get_context(bot=bot, chat_id=user_id, user_id=user_id)
        await _reset_user_flow(user_id, state, cancel_expiry=False)
        await bot.send_message(user_id, GENERATION_EXPIRED_TEXT, reply_markup=START_KB)
    except asyncio.CancelledError:
        return
    except Exception:
        logging.exception("Не удалось автоматически очистить подборку пользователя %s", user_id)
    finally:
        current_task = generation_expiry_tasks.get(user_id)
        if current_task is asyncio.current_task():
            generation_expiry_tasks.pop(user_id, None)


def _schedule_generation_expiry(user_id: int) -> None:
    _cancel_generation_expiry(user_id)
    generation_expiry_tasks[user_id] = asyncio.create_task(_expire_generated_results(user_id))


async def _animate_loading_message(message: Message) -> None:
    frame_index = 1
    try:
        while True:
            await asyncio.sleep(LOADING_FRAME_DELAY_SECONDS)
            await message.edit_text(LOADING_FRAMES[frame_index])
            frame_index = (frame_index + 1) % len(LOADING_FRAMES)
    except asyncio.CancelledError:
        return
    except Exception:
        logging.debug("Не удалось обновить индикатор загрузки", exc_info=True)


async def _start_loading_animation(message: Message) -> asyncio.Task:
    await message.edit_text(LOADING_FRAMES[0])
    return asyncio.create_task(_animate_loading_message(message))


START_KB = kb([("ℹ️ Как это работает", "start_help")])
RESULT_KB = kb([("❤️ Помочь", "help_contacts"), ("🔁 Перегенерировать", "regenerate"), ("🆕 Начать заново", "start_over")])
PUBLISH_KB = kb(
    [
        ("📤 Отправить в канал", "publish_selected"),
        ("❤️ Помочь", "help_contacts"),
        ("🔁 Перегенерировать", "regenerate"),
        ("🆕 Начать заново", "start_over"),
    ]
)
latest_sessions.update(_load_latest_sessions())
pet_counter_lock = asyncio.Lock()


def photo_pick_kb(index: int, *, selected: bool = False) -> InlineKeyboardMarkup:
    label = "✅ В подборке" if selected else "⭐ Добавить в подборку"
    return kb([(label, f"pick_photo:{index}")])


def text_option_kb(index: int, *, selected: bool = False) -> InlineKeyboardMarkup:
    select_label = "✅ В подборке" if selected else "✅ Выбрать"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=select_label, callback_data=f"pick_text:{index}"),
                InlineKeyboardButton(text="✏️ Редактировать", callback_data=f"edit_text:{index}"),
            ]
        ]
    )


async def _send_text_option(
    target: Message,
    text: str,
    index: int,
    total: int,
    *,
    selected: bool = False,
) -> Message:
    return await target.answer(
        _format_text_option(text, index, total),
        reply_markup=text_option_kb(index, selected=selected),
    )


async def _update_text_option_message(
    chat_id: int,
    message_id: int,
    text: str,
    index: int,
    total: int,
    *,
    selected: bool = False,
) -> None:
    await bot.edit_message_text(
        chat_id=chat_id,
        message_id=message_id,
        text=_format_text_option(text, index, total),
        reply_markup=text_option_kb(index, selected=selected),
    )


def _set_generated_result(
    user_id: int,
    *,
    images: list[bytes] | None = None,
    texts: list[str] | None = None,
    reset_photo: bool = True,
    reset_text: bool = False,
) -> None:
    current = latest_generated.get(
        user_id,
        {
            "images": [],
            "texts": [],
            "text_message_ids": [],
            "selected_photo_indices": [],
            "selected_text_index": None,
            "last_post_key": None,
            "last_post_number": None,
            "selection_prompt_message_id": None,
            "selection_prompt_chat_id": None,
        },
    )

    if images is not None:
        current["images"] = images
    if texts is not None:
        current["texts"] = texts
        if reset_text:
            current["text_message_ids"] = []

    if reset_photo:
        current["selected_photo_indices"] = []
    if reset_text:
        current["selected_text_index"] = None

    current.pop("selected_photo_index", None)
    current["last_post_key"] = None
    current["last_post_number"] = None
    latest_generated[user_id] = current


def _get_selected_photo_indices(generated: dict) -> list[int]:
    selected = generated.get("selected_photo_indices") or []
    if not selected and isinstance(generated.get("selected_photo_index"), int):
        selected = [generated["selected_photo_index"]]
    return sorted({int(index) for index in selected})


def _is_ready_for_publish(generated: dict | None) -> bool:
    if not generated:
        return False
    return bool(_get_selected_photo_indices(generated)) and generated.get("selected_text_index") is not None


def _build_selection_status(generated: dict) -> str:
    selected_photos = _get_selected_photo_indices(generated)
    photo_count = len(selected_photos)
    text_index = generated.get("selected_text_index")
    photo_labels = ", ".join(str(index + 1) for index in selected_photos)

    if photo_count and text_index is not None:
        return f"Готово к отправке: выбрано фото {photo_labels} и описание {text_index + 1}."
    if photo_count:
        return f"Выбрано фото: {photo_labels}."
    if text_index is not None:
        return f"Выбрано описание: {text_index + 1}."
    return "Сначала выберите хотя бы одно фото и одно описание."


async def _safe_answer_callback(
    call: CallbackQuery,
    text: str | None = None,
    *,
    show_alert: bool = False,
) -> None:
    try:
        await call.answer(text, show_alert=show_alert)
    except TelegramBadRequest:
        logging.debug("Не удалось ответить на callback: query устарел", exc_info=True)


def _is_message_not_modified(exc: TelegramBadRequest) -> bool:
    return "message is not modified" in str(exc).lower()


async def _safe_edit_message_text(
    message: Message,
    text: str,
    *,
    reply_markup: InlineKeyboardMarkup | None = None,
) -> bool:
    try:
        await message.edit_text(text, reply_markup=reply_markup)
        return True
    except TelegramBadRequest as exc:
        if _is_message_not_modified(exc):
            return False
        raise


async def _upsert_selection_prompt(
    *,
    user_id: int,
    chat_id: int,
    target_message: Message | None = None,
) -> None:
    generated = latest_generated.get(user_id)
    if not generated:
        return

    prompt_text = _build_selection_status(generated)
    reply_markup = PUBLISH_KB if _is_ready_for_publish(generated) else RESULT_KB
    prompt_message_id = generated.get("selection_prompt_message_id")
    prompt_chat_id = generated.get("selection_prompt_chat_id") or chat_id

    if isinstance(prompt_message_id, int):
        try:
            await bot.edit_message_text(
                chat_id=prompt_chat_id,
                message_id=prompt_message_id,
                text=prompt_text,
                reply_markup=reply_markup,
            )
            return
        except TelegramBadRequest as exc:
            if _is_message_not_modified(exc):
                return

    if target_message is None:
        sent_message = await bot.send_message(chat_id, prompt_text, reply_markup=reply_markup)
    else:
        sent_message = await target_message.answer(prompt_text, reply_markup=reply_markup)

    generated["selection_prompt_message_id"] = sent_message.message_id
    generated["selection_prompt_chat_id"] = sent_message.chat.id


def _choice_state_prompt(state_name: str | None) -> tuple[str, InlineKeyboardMarkup] | None:
    prompts = {
        Form.animal_type.state: (
            "Кто это? Выберите вариант кнопкой ниже.",
            kb([("🐱 Кошка", "cat"), ("🐶 Собака", "dog")]),
        ),
        Form.sex.state: (
            "Пол животного? Выберите кнопку ниже.",
            kb([("♂ Самец", "male"), ("♀ Самка", "female")]),
        ),
        Form.age.state: (
            "Возраст? Выберите один вариант кнопкой.",
            kb([
                ("🍼 Котёнок / Щенок", "baby"),
                ("🌱 Молодой", "young"),
                ("🐾 Взрослый", "adult"),
                ("🌿 Пожилой", "senior"),
            ]),
        ),
        Form.size.state: (
            "Размер? Выберите кнопку ниже.",
            kb([
                ("🤏 Маленький", "small"),
                ("🐕 Средний", "medium"),
                ("🦁 Крупный", "large"),
            ]),
        ),
        Form.character.state: (
            "Характер? Выберите одну кнопку.",
            kb([
                ("😌 Спокойный", "calm"),
                ("⚡ Игривый", "playful"),
                ("🥰 Ласковый", "affectionate"),
                ("😎 Независимый", "independent"),
            ]),
        ),
        Form.health.state: (
            "Здоровье? Выберите вариант кнопкой.",
            kb([
                ("💉 Привит", "vaccinated"),
                ("✂️ Стерилизован", "sterilized"),
                ("💉✂️ Привит + Стерилизован", "both"),
                ("❓ Нет данных", "unknown"),
            ]),
        ),
    }
    return prompts.get(state_name)


def _format_text_option(text: str, index: int, total: int) -> str:
    return f"Описание {index + 1} из {total}\n\n{text.strip()}"


async def _download_telegram_file_bytes(file_id: str) -> bytes:
    file = await bot.get_file(file_id)
    file_bytes = await bot.download_file(file.file_path)
    return file_bytes.read()


def _is_supported_image_document(message: Message) -> bool:
    document = message.document
    if not document:
        return False

    mime_type = (document.mime_type or "").lower()
    file_name = (document.file_name or "").lower()
    return mime_type in {"image/jpeg", "image/png", "image/webp"} or file_name.endswith(
        (".jpg", ".jpeg", ".png", ".webp")
    )


def _is_unsupported_phone_image(message: Message) -> bool:
    document = message.document
    if not document:
        return False

    mime_type = (document.mime_type or "").lower()
    file_name = (document.file_name or "").lower()
    return mime_type in {"image/heic", "image/heif"} or file_name.endswith((".heic", ".heif"))


def _build_photo_overlay_text(session: dict) -> str:
    name = session.get("name", "").strip() or "Без клички"
    labels = get_profile_labels(session)

    lines = [
        f"Кличка: {name}",
        f"Возраст: {labels['age']}",
        f"Размер: {labels['size']}",
        f"Характер: {labels['character']}",
        f"Здоровье: {labels['health']}",
    ]
    return "\n".join(lines)


def _load_overlay_font(font_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_candidates = [
        "arial.ttf",
        "segoeui.ttf",
        "DejaVuSans.ttf",
    ]
    for font_name in font_candidates:
        try:
            return ImageFont.truetype(font_name, font_size)
        except OSError:
            continue
    return ImageFont.load_default()


def _overlay_text_on_photo(image_bytes: bytes, session: dict) -> bytes:
    overlay_text = _build_photo_overlay_text(session)

    with Image.open(BytesIO(image_bytes)) as image:
        base = image.convert("RGBA")

    width, height = base.size
    font_size = max(22, min(width, height) // 28)
    padding = max(18, min(width, height) // 36)
    line_spacing = max(8, font_size // 4)
    font = _load_overlay_font(font_size)

    sample_left = int(width * 0.48)
    sample_top = int(height * 0.62)
    sample_region = base.crop((sample_left, sample_top, width, height)).convert("L")
    brightness = ImageStat.Stat(sample_region).mean[0]

    if brightness >= 145:
        text_fill = (16, 16, 16, 255)
        stroke_fill = (250, 250, 250, 220)
    else:
        text_fill = (255, 255, 255, 255)
        stroke_fill = (18, 18, 18, 220)

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    text_bbox = draw.multiline_textbbox((0, 0), overlay_text, font=font, spacing=line_spacing)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    text_x = max(padding, width - padding - text_width)
    text_y = max(padding, height - padding - text_height)
    draw.multiline_text(
        (text_x, text_y),
        overlay_text,
        font=font,
        fill=text_fill,
        spacing=line_spacing,
        align="right",
        stroke_width=max(2, font_size // 14),
        stroke_fill=stroke_fill,
    )

    composed = Image.alpha_composite(base, overlay).convert("RGB")
    output = BytesIO()
    composed.save(output, format="PNG")
    return output.getvalue()


async def _reserve_next_pet_number() -> int:
    async with pet_counter_lock:
        next_number = 1

        try:
            raw_value = PET_COUNTER_FILE.read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            raw_value = ""
        except OSError:
            logging.exception("Не удалось прочитать pet_counter.txt, начинаю счётчик с 1")
            raw_value = ""

        if raw_value:
            try:
                parsed_value = int(raw_value)
                if parsed_value > 0:
                    next_number = parsed_value
            except ValueError:
                logging.warning("Некорректное значение в pet_counter.txt: %r. Счётчик сброшен на 1.", raw_value)

        try:
            PET_COUNTER_FILE.write_text(f"{next_number + 1}\n", encoding="utf-8")
        except OSError as exc:
            raise RuntimeError("Не удалось сохранить следующий номер питомца.") from exc

        return next_number


def _build_post_header(pet_name: str, pet_number: int) -> str:
    clean_name = pet_name.strip()
    if clean_name and clean_name != "Без клички":
        return f"{clean_name} №{pet_number}"
    return f"№{pet_number}"


def _build_channel_post_text(*, pet_name: str, pet_number: int, description: str) -> str:
    parts = [_build_post_header(pet_name, pet_number), description.strip()]
    return "\n\n".join(part for part in parts if part).strip()


def _build_help_message() -> str:
    phone_line = f"Контакт: {CONTACT_PHONE}" if CONTACT_PHONE else "Контакт: не настроен"
    card_line = f"Карта: {CARD_NUMBER}" if CARD_NUMBER else "Карта: не настроена"
    channel_line = "Канал: https://t.me/save_cat"
    return "\n".join([phone_line, card_line, channel_line])


def _build_start_help_text() -> str:
    support_card = CARD_NUMBER if CARD_NUMBER else "не настроен"
    support_phone = CONTACT_PHONE if CONTACT_PHONE else "не настроен"
    return (
        "Одно фото может изменить целую жизнь\n\n"
        "Мы не профессиональные фотографы и не студия ретуши. Мы — обычные люди, которые каждый день видят глаза тех, кого предали. "
        "Мы знаем: за «неудачным» кадром в тёмном вольере часто скрывается самая добрая и преданная душа. "
        "Но чтобы будущий хозяин это заметил, ему нужно помочь разглядеть это чудо.\n\n"
        "Что мы делаем?\n"
        "Наш проект помогает превратить обычные, серые снимки бездомных животных в красивые и «цепляющие» объявления. "
        "Мы верим, что у каждого хвостика должен быть шанс на счастливый билет домой.\n\n"
        "🤍 Как вы можете помочь?\n"
        "Нам не нужны миллионы, нам нужно ваше участие:\n\n"
        "Расскажите о нас: Репост этого поста может увидеть волонтёр, который прямо сейчас не знает, как пристроить своего подопечного.\n\n"
        "Присылайте фото: Если вы курируете животное — присылайте снимки нам в бота. Мы вместе сделаем их презентабельными.\n\n"
        "Поддержите словом: Ваша вера в проект даёт нам силы продолжать.\n"
        f"Поддержать материально: карта {support_card}, контакт {support_phone}.\n\n"
        "Маленьких добрых дел не бывает. Иногда одна исправленная фотография — это начало большой истории любви между человеком и его новым лучшим другом.\n\n"
        "Давайте дарить шансы вместе! 🐾"
    )


def _build_help_keyboard(*, pet_number: int | None = None) -> InlineKeyboardMarkup:
    callback_data = f"help_pet:{pet_number}" if pet_number is not None else "help_contacts"
    return kb([("❤️ Помочь", callback_data)])


async def _send_selected_images(
    channel_id: str,
    images: list[bytes],
    photo_indices: list[int],
    session: dict,
) -> None:
    selected_images = [_overlay_text_on_photo(images[index], session) for index in photo_indices]

    if len(selected_images) == 1:
        await bot.send_photo(
            channel_id,
            BufferedInputFile(selected_images[0], filename="pet_selected_1.png"),
        )
        return

    media = [
        InputMediaPhoto(media=BufferedInputFile(image_bytes, filename=f"pet_selected_{position}.png"))
        for position, image_bytes in enumerate(selected_images, start=1)
    ]
    await bot.send_media_group(channel_id, media=media)


async def _show_publish_prompt(call: CallbackQuery) -> None:
    await _upsert_selection_prompt(
        user_id=call.from_user.id,
        chat_id=call.message.chat.id,
        target_message=call.message,
    )


async def _publish_selected_post(call: CallbackQuery) -> bool:
    user_id = call.from_user.id
    generated = latest_generated.get(user_id)
    if not generated:
        await call.message.answer("Сначала сгенерируйте фото и описание заново.")
        return False

    photo_indices = _get_selected_photo_indices(generated)
    text_index = generated.get("selected_text_index")
    images = generated.get("images", [])
    texts = generated.get("texts", [])

    if not photo_indices or text_index is None:
        return False

    if text_index >= len(texts) or any(index >= len(images) for index in photo_indices):
        await call.message.answer("Выбор устарел. Сгенерируйте варианты ещё раз.")
        return False

    if not TELEGRAM_SPECIAL_CHANNEL_ID:
        await call.message.answer(
            "Публикация в новый канал не настроена. Добавьте TELEGRAM_SPECIAL_CHANNEL_ID в .env, когда создадите канал."
        )
        return False

    post_key = (tuple(photo_indices), text_index)
    if generated.get("last_post_key") == post_key:
        await call.message.answer("Этот вариант уже отправлен в канал.")
        return True

    session = _get_latest_session(user_id)
    pet_name = session.get("name", "").strip() or "Без клички"
    try:
        pet_number = await _reserve_next_pet_number()
    except RuntimeError:
        logging.exception("Не удалось зарезервировать номер питомца для публикации")
        await call.message.answer("Не удалось подготовить номер питомца для публикации. Попробуйте ещё раз.")
        return False
    post_text = _build_channel_post_text(
        pet_name=pet_name,
        pet_number=pet_number,
        description=texts[text_index],
    )

    await _send_selected_images(
        TELEGRAM_SPECIAL_CHANNEL_ID,
        images,
        photo_indices,
        session,
    )
    await bot.send_message(
        TELEGRAM_SPECIAL_CHANNEL_ID,
        post_text,
        reply_markup=_build_help_keyboard(pet_number=pet_number),
    )

    generated["last_post_key"] = post_key
    generated["last_post_number"] = pet_number
    await call.message.answer("Пост отправлен в канал.")
    return True


async def _store_photo_and_ask_name(
    message: Message,
    state: FSMContext,
    *,
    file_id: str,
    acknowledged: bool = False,
) -> None:
    photo_bytes = await _download_telegram_file_bytes(file_id)
    await state.update_data(photo_bytes=photo_bytes)
    await state.set_state(Form.name)
    _set_latest_session(message.from_user.id, {"photo_bytes": photo_bytes})
    prompt = "Фото получено. Как зовут питомца? Напишите кличку текстом или пропустите." if acknowledged else "Как зовут питомца? Напишите кличку текстом или пропустите."
    await message.answer(
        prompt,
        reply_markup=kb([("⏭ Пропустить", "skip_name")]),
    )


@dp.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await _reset_user_flow(message.from_user.id, state)
    await message.answer(START_PROMPT_TEXT, reply_markup=START_KB)


@dp.callback_query(Form.photo, F.data == "start_help")
async def handle_start_help(call: CallbackQuery):
    await _safe_answer_callback(call)
    await _safe_edit_message_text(
        call.message,
        _build_start_help_text(),
        reply_markup=START_KB,
    )


@dp.message(Form.photo, F.photo)
async def handle_photo(message: Message, state: FSMContext):
    photo = message.photo[-1]
    await _store_photo_and_ask_name(message, state, file_id=photo.file_id)


@dp.message(Form.photo, lambda message: _is_supported_image_document(message))
async def handle_photo_document(message: Message, state: FSMContext):
    await _store_photo_and_ask_name(
        message,
        state,
        file_id=message.document.file_id,
        acknowledged=True,
    )


@dp.message(Form.photo, lambda message: _is_unsupported_phone_image(message))
async def handle_photo_heic(message: Message):
    await message.answer(
        "Файл HEIC/HEIF не поддерживается. Отправьте снимок как обычное фото через галерею Telegram, не как файл."
    )


@dp.message(Form.photo)
async def handle_photo_wrong(message: Message):
    await message.answer(
        "Пожалуйста, пришлите фото животного. Лучше отправлять его как обычное фото через галерею Telegram, а не как файл."
    )


async def ask_animal_type(target: Message | CallbackQuery, state: FSMContext) -> None:
    await state.set_state(Form.animal_type)
    if isinstance(target, CallbackQuery):
        await _safe_answer_callback(target)
        await _safe_edit_message_text(
            target.message,
            "Кто это?",
            reply_markup=kb([("🐱 Кошка", "cat"), ("🐶 Собака", "dog")]),
        )
        return

    await target.answer(
        "Кто это?",
        reply_markup=kb([("🐱 Кошка", "cat"), ("🐶 Собака", "dog")]),
    )


@dp.callback_query(Form.name, F.data == "skip_name")
async def handle_skip_name(call: CallbackQuery, state: FSMContext):
    await call.answer()
    await state.update_data(name="")
    session = await state.get_data()
    _set_latest_session(call.from_user.id, session)
    await ask_animal_type(call, state)


@dp.message(Form.name, F.text)
async def handle_name(message: Message, state: FSMContext):
    await state.update_data(name=message.text.strip())
    session = await state.get_data()
    _set_latest_session(message.from_user.id, session)
    await ask_animal_type(message, state)


@dp.message(Form.name)
async def handle_name_wrong(message: Message):
    await message.answer("Напишите кличку текстом или нажмите «Пропустить».")


@dp.callback_query(F.data == "skip_name", lambda call: _has_pending_name_step(_get_latest_session(call.from_user.id)))
async def recover_skip_name_without_state(call: CallbackQuery, state: FSMContext):
    await call.answer()
    session = _get_latest_session(call.from_user.id)
    session["name"] = ""
    _set_latest_session(call.from_user.id, session)
    await state.set_data(session)
    await ask_animal_type(call, state)


@dp.message(F.text, lambda message: _has_pending_name_step(_get_latest_session(message.from_user.id)))
async def recover_name_without_state(message: Message, state: FSMContext):
    session = _get_latest_session(message.from_user.id)
    session["name"] = message.text.strip()
    _set_latest_session(message.from_user.id, session)
    await state.set_data(session)
    await ask_animal_type(message, state)


@dp.callback_query(Form.animal_type, F.data.in_({"cat", "dog"}))
async def handle_animal_type(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(animal_type=call.data)
    await state.set_state(Form.sex)
    await _safe_edit_message_text(
        call.message,
        "Пол животного?",
        reply_markup=kb([("♂ Самец", "male"), ("♀ Самка", "female")]),
    )


@dp.callback_query(Form.sex, F.data.in_({"male", "female"}))
async def handle_sex(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(sex=call.data)
    await state.set_state(Form.age)
    await _safe_edit_message_text(
        call.message,
        "Возраст?",
        reply_markup=kb([
            ("🍼 Котёнок / Щенок", "baby"),
            ("🌱 Молодой", "young"),
            ("🐾 Взрослый", "adult"),
            ("🌿 Пожилой", "senior"),
        ]),
    )


@dp.callback_query(Form.age, F.data.in_({"baby", "young", "adult", "senior"}))
async def handle_age(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(age=call.data)
    await state.set_state(Form.size)
    await _safe_edit_message_text(
        call.message,
        "Размер?",
        reply_markup=kb([
            ("🤏 Маленький", "small"),
            ("🐕 Средний", "medium"),
            ("🦁 Крупный", "large"),
        ]),
    )


@dp.callback_query(Form.size, F.data.in_({"small", "medium", "large"}))
async def handle_size(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(size=call.data)
    await state.set_state(Form.character)
    await _safe_edit_message_text(
        call.message,
        "Характер?",
        reply_markup=kb([
            ("😌 Спокойный", "calm"),
            ("⚡ Игривый", "playful"),
            ("🥰 Ласковый", "affectionate"),
            ("😎 Независимый", "independent"),
        ]),
    )


@dp.callback_query(Form.character, F.data.in_({"calm", "playful", "affectionate", "independent"}))
async def handle_character(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(character=call.data)
    await state.set_state(Form.health)
    await _safe_edit_message_text(
        call.message,
        "Здоровье?",
        reply_markup=kb([
            ("💉 Привит", "vaccinated"),
            ("✂️ Стерилизован", "sterilized"),
            ("💉✂️ Привит + Стерилизован", "both"),
            ("❓ Нет данных", "unknown"),
        ]),
    )


@dp.callback_query(Form.health, F.data.in_({"vaccinated", "sterilized", "both", "unknown"}))
async def handle_health(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(health=call.data)
    await state.set_state(Form.comments)
    await _safe_edit_message_text(
        call.message,
        "Есть особые комментарии? Напишите или пропустите.",
        reply_markup=kb([("⏭ Пропустить", "skip_comments")]),
    )


@dp.message(Form.animal_type)
@dp.message(Form.sex)
@dp.message(Form.age)
@dp.message(Form.size)
@dp.message(Form.character)
@dp.message(Form.health)
async def handle_button_only_states_wrong(message: Message, state: FSMContext):
    prompt = _choice_state_prompt(await state.get_state())
    if not prompt:
        return

    text, reply_markup = prompt
    await message.answer(text, reply_markup=reply_markup)


@dp.callback_query(Form.comments, F.data == "skip_comments")
async def handle_skip_comments(call: CallbackQuery, state: FSMContext):
    await _safe_answer_callback(call)
    await state.update_data(comments="")
    await state.set_state(Form.result)
    await _safe_edit_message_text(
        call.message,
        "Всё готово! Запускаю генерацию.",
        reply_markup=kb([("🚀 Генерировать", "generate")]),
    )


@dp.message(Form.comments, F.text)
async def handle_comments_text(message: Message, state: FSMContext):
    await state.update_data(comments=message.text)
    await state.set_state(Form.result)
    await message.answer(
        "Комментарий сохранён. Запускаю генерацию.",
        reply_markup=kb([("🚀 Генерировать", "generate")]),
    )


@dp.message(Form.comments)
async def handle_comments_wrong(message: Message):
    await message.answer(
        "Напишите комментарий текстом или нажмите «Пропустить».",
        reply_markup=kb([("⏭ Пропустить", "skip_comments")]),
    )


@dp.callback_query(F.data == "generate")
async def handle_generate(call: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    photo_bytes: bytes = data.get("photo_bytes", b"")

    if not photo_bytes:
        await call.answer("Фото не найдено, начните заново с /start", show_alert=True)
        return

    await call.answer()
    _set_latest_session(call.from_user.id, {**data, "photo_bytes": photo_bytes})
    _cancel_generation_expiry(call.from_user.id)

    loading_task = await _start_loading_animation(call.message)

    try:
        images, texts = await asyncio.gather(
            generate_images(photo_bytes, data, count=3),
            generate_texts(data, count=5),
        )
    except Exception:
        logging.exception("Ошибка генерации")
        latest_generated.pop(call.from_user.id, None)
        await state.set_state(Form.result)
        await call.message.answer(
            "Произошла ошибка при генерации. Попробуйте ещё раз через минуту или начните заново с /start.",
            reply_markup=RESULT_KB,
        )
        return
    finally:
        loading_task.cancel()
        with suppress(asyncio.CancelledError):
            await loading_task

    if not images or not texts:
        latest_generated.pop(call.from_user.id, None)
        await state.set_state(Form.result)
        missing_parts = []
        if not images:
            missing_parts.append("фото")
        if not texts:
            missing_parts.append("описания")
        await call.message.answer(
            f"Не удалось получить {' и '.join(missing_parts)}. Нажмите «Перегенерировать», чтобы попробовать снова с теми же данными.",
            reply_markup=RESULT_KB,
        )
        return

    _set_generated_result(
        call.from_user.id,
        images=images,
        texts=texts,
        reset_photo=True,
        reset_text=True,
    )
    _schedule_generation_expiry(call.from_user.id)

    if images:
        for i, img_bytes in enumerate(images, 1):
            await call.message.answer_photo(
                BufferedInputFile(img_bytes, filename=f"pet_{i}.png"),
                caption=f"Фото {i} из {len(images)}",
                reply_markup=photo_pick_kb(i - 1),
            )

    text_message_ids: list[int] = []
    for i, text in enumerate(texts):
        sent_message = await _send_text_option(call.message, text, i, len(texts))
        text_message_ids.append(sent_message.message_id)

    generated = latest_generated.get(call.from_user.id)
    if generated is not None:
        generated["text_message_ids"] = text_message_ids

    await state.set_state(Form.result)
    await _upsert_selection_prompt(
        user_id=call.from_user.id,
        chat_id=call.message.chat.id,
        target_message=call.message,
    )


@dp.callback_query(F.data == "regenerate")
async def handle_regenerate(call: CallbackQuery, state: FSMContext):
    data = _get_latest_session(call.from_user.id)
    if not data:
        data = await state.get_data()
    photo_bytes: bytes = data.get("photo_bytes", b"")
    generated = latest_generated.get(call.from_user.id, {})
    existing_texts = generated.get("texts", [])
    regenerate_all = not existing_texts

    if not photo_bytes:
        await call.answer("Сессия потерялась, пришлите фото заново.", show_alert=True)
        return

    await call.answer()
    _cancel_generation_expiry(call.from_user.id)
    loading_task = await _start_loading_animation(call.message)

    try:
        if regenerate_all:
            images, texts = await asyncio.gather(
                generate_images(photo_bytes, data, count=3),
                generate_texts(data, count=5),
            )
        else:
            images = await generate_images(photo_bytes, data, count=3)
            texts = existing_texts
    except Exception:
        logging.exception("Ошибка перегенерации")
        await state.set_state(Form.result)
        await call.message.answer(
            "Не удалось перегенерировать материалы. Попробуйте ещё раз через минуту или начните заново с /start.",
            reply_markup=RESULT_KB,
        )
        return
    finally:
        loading_task.cancel()
        with suppress(asyncio.CancelledError):
            await loading_task

    if not images or not texts:
        latest_generated.pop(call.from_user.id, None)
        await state.set_state(Form.result)
        missing_parts = []
        if not images:
            missing_parts.append("фото")
        if not texts:
            missing_parts.append("описания")
        await call.message.answer(
            f"Не удалось получить {' и '.join(missing_parts)}. Нажмите «Перегенерировать», чтобы попробовать ещё раз.",
            reply_markup=RESULT_KB,
        )
        return

    _set_generated_result(
        call.from_user.id,
        images=images,
        texts=texts if regenerate_all else None,
        reset_photo=True,
        reset_text=regenerate_all,
    )
    _schedule_generation_expiry(call.from_user.id)

    for i, img_bytes in enumerate(images, 1):
        await call.message.answer_photo(
            BufferedInputFile(img_bytes, filename=f"pet_regenerated_{i}.png"),
            caption=f"Новый вариант {i} из {len(images)}",
            reply_markup=photo_pick_kb(i - 1),
        )

    if regenerate_all:
        text_message_ids: list[int] = []
        for i, text in enumerate(texts):
            sent_message = await _send_text_option(call.message, text, i, len(texts))
            text_message_ids.append(sent_message.message_id)
        generated = latest_generated.get(call.from_user.id)
        if generated is not None:
            generated["text_message_ids"] = text_message_ids

    _set_latest_session(call.from_user.id, {**data, "photo_bytes": photo_bytes})
    await state.set_state(Form.result)
    await _upsert_selection_prompt(
        user_id=call.from_user.id,
        chat_id=call.message.chat.id,
        target_message=call.message,
    )


@dp.callback_query(F.data.startswith("pick_photo:"))
async def handle_pick_photo(call: CallbackQuery):
    generated = latest_generated.get(call.from_user.id)
    if not generated:
        await _safe_answer_callback(call, "Варианты устарели. Сгенерируйте фото заново.", show_alert=True)
        return

    try:
        photo_index = int(call.data.split(":", 1)[1])
    except ValueError:
        await _safe_answer_callback(call, "Некорректный выбор фото.", show_alert=True)
        return

    if photo_index >= len(generated.get("images", [])):
        await _safe_answer_callback(call, "Это фото уже недоступно. Сгенерируйте новые варианты.", show_alert=True)
        return

    selected = set(_get_selected_photo_indices(generated))
    is_selected = photo_index not in selected
    if photo_index in selected:
        selected.remove(photo_index)
        generated["selected_photo_indices"] = sorted(selected)
        await _safe_answer_callback(call, "Фото убрано из подборки.")
    else:
        selected.add(photo_index)
        generated["selected_photo_indices"] = sorted(selected)
        await _safe_answer_callback(call, f"Фото добавлено. Сейчас выбрано: {len(selected)}.")

    with suppress(TelegramBadRequest):
        await call.message.edit_reply_markup(
            reply_markup=photo_pick_kb(photo_index, selected=is_selected)
        )

    await _show_publish_prompt(call)


@dp.callback_query(F.data.startswith("pick_text:"))
async def handle_pick_text(call: CallbackQuery):
    generated = latest_generated.get(call.from_user.id)
    if not generated:
        await _safe_answer_callback(call, "Описания устарели. Сгенерируйте варианты заново.", show_alert=True)
        return

    try:
        text_index = int(call.data.split(":", 1)[1])
    except ValueError:
        await _safe_answer_callback(call, "Некорректный выбор описания.", show_alert=True)
        return

    if text_index >= len(generated.get("texts", [])):
        await _safe_answer_callback(call, "Это описание уже недоступно. Сгенерируйте новые варианты.", show_alert=True)
        return

    previous_text_index = generated.get("selected_text_index")
    generated["selected_text_index"] = text_index
    await _safe_answer_callback(call, "Описание добавлено в подборку.")

    with suppress(TelegramBadRequest):
        await call.message.edit_reply_markup(
            reply_markup=text_option_kb(text_index, selected=True)
        )

    text_message_ids = generated.get("text_message_ids") or []
    if (
        isinstance(previous_text_index, int)
        and previous_text_index != text_index
        and previous_text_index < len(text_message_ids)
    ):
        with suppress(TelegramBadRequest):
            await bot.edit_message_reply_markup(
                chat_id=call.message.chat.id,
                message_id=text_message_ids[previous_text_index],
                reply_markup=text_option_kb(previous_text_index, selected=False),
            )

    await _show_publish_prompt(call)


@dp.callback_query(F.data.startswith("edit_text:"))
async def handle_edit_text_request(call: CallbackQuery, state: FSMContext):
    generated = latest_generated.get(call.from_user.id)
    if not generated:
        await call.answer("Описания устарели. Сгенерируйте варианты заново.", show_alert=True)
        return

    try:
        text_index = int(call.data.split(":", 1)[1])
    except ValueError:
        await call.answer("Некорректный выбор описания.", show_alert=True)
        return

    texts = generated.get("texts", [])
    if text_index >= len(texts):
        await call.answer("Это описание уже недоступно. Сгенерируйте новые варианты.", show_alert=True)
        return

    await state.set_state(Form.edit_text)
    await state.update_data(
        edit_text_index=text_index,
        edit_message_id=call.message.message_id,
        edit_message_chat_id=call.message.chat.id,
    )
    await call.answer("Можно редактировать.")
    await call.message.answer(
        "Отправьте новый текст для этого описания одним сообщением.\n\n"
        f"Текущий вариант:\n\n{texts[text_index]}"
    )


@dp.message(Form.edit_text, F.text)
async def handle_edit_text_submit(message: Message, state: FSMContext):
    data = await state.get_data()
    text_index = data.get("edit_text_index")
    edit_message_id = data.get("edit_message_id")
    edit_message_chat_id = data.get("edit_message_chat_id")

    if not isinstance(text_index, int) or not isinstance(edit_message_id, int) or not isinstance(edit_message_chat_id, int):
        await state.set_state(Form.result)
        await message.answer("Не удалось сохранить правку. Выберите описание заново.")
        return

    generated = latest_generated.get(message.from_user.id)
    if not generated:
        await state.set_state(Form.result)
        await message.answer("Описания устарели. Сгенерируйте варианты заново.")
        return

    texts = generated.get("texts", [])
    if text_index >= len(texts):
        await state.set_state(Form.result)
        await message.answer("Это описание уже недоступно. Сгенерируйте варианты заново.")
        return

    updated_text = message.text.strip()
    if not updated_text:
        await message.answer("Текст не должен быть пустым. Пришлите исправленное описание ещё раз.")
        return

    previous_text = texts[text_index].strip()
    generated["texts"][text_index] = updated_text
    if updated_text != previous_text:
        await _update_text_option_message(
            chat_id=edit_message_chat_id,
            message_id=edit_message_id,
            text=updated_text,
            index=text_index,
            total=len(generated["texts"]),
            selected=generated.get("selected_text_index") == text_index,
        )

    await state.update_data(
        edit_text_index=None,
        edit_message_id=None,
        edit_message_chat_id=None,
    )
    await state.set_state(Form.result)

    if updated_text == previous_text:
        await message.answer("Описание оставлено без изменений.")
    else:
        await message.answer("Описание обновлено и сохранено.")

    await _upsert_selection_prompt(
        user_id=message.from_user.id,
        chat_id=message.chat.id,
        target_message=message,
    )


@dp.message(Form.edit_text)
async def handle_edit_text_wrong(message: Message):
    await message.answer("Пришлите новый текст описания одним сообщением.")


@dp.message(Form.result)
async def handle_result_wrong(message: Message):
    generated = latest_generated.get(message.from_user.id)
    await message.answer(
        "На этом шаге используйте кнопки: выберите фото, описание, нажмите "
        "«Перегенерировать» или «Начать заново».",
        reply_markup=PUBLISH_KB if _is_ready_for_publish(generated) else RESULT_KB,
    )


@dp.callback_query(F.data == "publish_selected")
async def handle_publish_selected(call: CallbackQuery):
    generated = latest_generated.get(call.from_user.id)
    if not _is_ready_for_publish(generated):
        await call.answer("Сначала выберите фото и описание.", show_alert=True)
        return

    await call.answer()
    await _publish_selected_post(call)


@dp.callback_query(F.data == "help_contacts")
@dp.callback_query(F.data.startswith("help_pet:"))
async def handle_help_contacts(call: CallbackQuery):
    await _safe_answer_callback(call)
    await call.message.answer(
        _build_help_message(),
        disable_web_page_preview=True,
    )


@dp.callback_query(F.data == "start_over")
async def handle_start_over(call: CallbackQuery, state: FSMContext):
    await call.answer("Текущая сессия очищена.")
    await _reset_user_flow(call.from_user.id, state)
    await call.message.answer(START_PROMPT_TEXT, reply_markup=START_KB)


@dp.callback_query()
async def handle_unknown_callback(call: CallbackQuery):
    await call.answer("Кнопка устарела. Попробуйте ещё раз или начните с /start.", show_alert=True)


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    if not os.getenv("RAILWAY_ENVIRONMENT"):
        print(
            "Ошибка: бот должен запускаться только на Railway.\n"
            "Локальный запуск отключён, чтобы избежать конфликта polling-инстансов."
        )
        raise SystemExit(1)
    asyncio.run(main())
