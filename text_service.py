import re

from openai import AsyncOpenAI

from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

SEX_NAMES = {"male": "самец", "female": "самка"}
ANIMAL_NAMES = {"cat": "кошка", "dog": "собака"}
AGE_NAMES = {
    "baby": "котёнок/щенок",
    "young": "молодой",
    "adult": "взрослый",
    "senior": "пожилой",
}
SIZE_NAMES = {"small": "маленький", "medium": "средний", "large": "крупный"}
CHARACTER_NAMES = {
    "calm": "спокойный",
    "playful": "игривый",
    "affectionate": "ласковый",
    "independent": "независимый",
}
HEALTH_NAMES = {
    "vaccinated": "привит",
    "sterilized": "стерилизован",
    "both": "привит и стерилизован",
    "unknown": "нет данных",
}


def _build_profile(data: dict) -> str:
    name = data.get("name", "").strip()
    animal = ANIMAL_NAMES.get(data.get("animal_type", ""), "животное")
    sex = SEX_NAMES.get(data.get("sex", ""), "")
    age = AGE_NAMES.get(data.get("age", ""), "")
    size = SIZE_NAMES.get(data.get("size", ""), "")
    character = CHARACTER_NAMES.get(data.get("character", ""), "")
    health = HEALTH_NAMES.get(data.get("health", ""), "")
    comments = data.get("comments", "")

    parts = []
    if name:
        parts.append(f"Кличка: {name}")

    parts.extend(
        [
            f"Тип: {animal}",
            f"Пол: {sex}",
            f"Возраст: {age}",
            f"Размер: {size}",
            f"Характер: {character}",
            f"Здоровье: {health}",
        ]
    )

    if comments:
        parts.append(f"Дополнительно: {comments}")

    return "\n".join(parts) + "\n"


def _split_generated_texts(raw_text: str) -> list[str]:
    normalized = raw_text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    separated = [part.strip() for part in re.split(r"\n\s*---+\s*\n", normalized) if part.strip()]
    if len(separated) > 1:
        return separated

    numbered = [
        re.sub(r"^\d+[.)]\s*", "", part).strip()
        for part in re.split(r"(?:^|\n)(?=\d+[.)]\s+)", normalized)
        if part.strip()
    ]
    if len(numbered) > 1:
        return numbered

    paragraphs = [part.strip() for part in re.split(r"\n{2,}", normalized) if part.strip()]
    if len(paragraphs) > 1:
        return paragraphs

    return [normalized]


async def generate_texts(animal_data: dict, count: int = 5) -> list[str]:
    """Генерирует count текстов-описаний для объявления."""
    profile = _build_profile(animal_data)
    name = animal_data.get("name", "").strip()

    naming_requirement = (
        f"- Используй кличку «{name}» естественно внутри текста\n"
        if name
        else "- Если клички нет, не придумывай её\n"
    )

    prompt = (
        "Ты — копирайтер волонтёрской организации по пристройке животных. "
        f"Напиши {count} разных текстов объявлений для поиска хозяина. "
        "Каждый текст — 3-5 предложений в разном стиле: "
        "трогательный, позитивный, информативный, душевный, с юмором.\n\n"
        f"Данные о животном:\n{profile}\n"
        "Требования:\n"
        f"{naming_requirement}"
        "- Тексты на русском языке\n"
        "- Каждый текст отделяй строкой '---'\n"
        "- Не нумеруй тексты\n"
        "- Не добавляй заголовки или пометки стиля\n"
        "- Тексты должны вызывать желание забрать животное домой"
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9,
    )

    raw_text = response.choices[0].message.content or ""
    texts = _split_generated_texts(raw_text)
    return texts[:count]
