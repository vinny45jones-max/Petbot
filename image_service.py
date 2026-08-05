import asyncio
import base64
import logging
import random
from io import BytesIO

from PIL import Image, ImageOps
from openai import APIError, AsyncOpenAI

from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY, max_retries=3)

# low / medium / high — влияет на детализацию выхода и цену
IMAGE_QUALITY = "medium"

# Первая удачная модель кэшируется, чтобы не биться в недоступную на каждом кадре
_working_model: str | None = None

BACKGROUNDS = [
    "a cozy Scandinavian living room with light wood, a soft neutral sofa, and clean natural daylight",
    "a bright modern kitchen with pale wood floors, soft window light, and a tidy warm interior",
    "a calm bedroom with warm neutral textiles, elegant furniture, and soft daylight",
    "a stylish home studio with minimal decor, natural textures, and balanced daylight",
    "a sunlit enclosed balcony with plants, woven textures, and a welcoming home feel",
    "a warm family room with a plush rug, soft furniture, and airy daytime lighting",
]

SHOT_VARIANTS = [
    {
        "composition": "a close portrait with the head and chest filling most of the frame",
        "distance": "The camera is close. The pet should occupy about 55 percent of the frame and the face must stay large and sharp.",
    },
    {
        "composition": "a clean medium portrait with the full head and upper body visible",
        "distance": "The camera is fairly close, but not extreme. The pet should occupy about 45 percent of the frame.",
    },
    {
        "composition": "a full-body shot with the pet naturally sitting or standing in the room",
        "distance": "The camera is a bit farther back. The full body should be visible and the pet should occupy about 35 percent of the frame.",
    },
]

LIGHTING = [
    "soft natural daylight",
    "bright diffused morning light",
    "warm editorial indoor light",
    "gentle window light with realistic shadows",
    "clean commercial pet-photography lighting",
    "soft studio-style light with natural fur tones",
]

ANIMAL_NAMES = {
    "cat": "cat",
    "dog": "dog",
}

SIZE_HINTS = {
    "small": "small",
    "medium": "medium-sized",
    "large": "large",
}

CHARACTER_HINTS = {
    "calm": "calm and gentle",
    "playful": "playful and lively",
    "affectionate": "sweet and affectionate",
    "independent": "confident and independent",
}


def _normalize_image(photo_bytes: bytes, max_size: int = 1024) -> Image.Image:
    with Image.open(BytesIO(photo_bytes)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        if max(normalized.size) > max_size:
            normalized.thumbnail((max_size, max_size))
        return normalized.copy()


def _image_to_png_bytes(image: Image.Image) -> bytes:
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _pick_output_size(image: Image.Image) -> str:
    """Подбирает ближайший поддерживаемый размер, чтобы не резать кадр в квадрат."""
    width, height = image.size
    ratio = width / height
    if ratio >= 1.2:
        return "1536x1024"
    if ratio <= 0.83:
        return "1024x1536"
    return "1024x1024"


def _build_reference(photo_bytes: bytes) -> tuple[tuple[str, bytes, str], str]:
    normalized = _normalize_image(photo_bytes, max_size=1536)
    reference = ("reference_full.png", _image_to_png_bytes(normalized), "image/png")
    return reference, _pick_output_size(normalized)


def _build_prompt(
    animal_data: dict,
    background: str,
    composition: str,
    distance: str,
    lighting: str,
) -> str:
    animal = ANIMAL_NAMES.get(animal_data.get("animal_type", ""), "pet")
    size = SIZE_HINTS.get(animal_data.get("size", ""), "")
    character = CHARACTER_HINTS.get(animal_data.get("character", ""), "")

    return (
        "Use the uploaded reference image as the exact same real pet identity. "
        "Preserve the exact face, muzzle, nose shape, eyes, ear shape, fur pattern, markings, coat color, proportions, and overall identity. "
        "Copy the face pixel by pixel as closely as possible: this must read as the same individual animal, not a lookalike. "
        "Do not turn it into a different animal, different breed, or different individual. "
        f"The pet is one {size} {animal} with a {character} vibe. "
        f"Place the pet in {background}. "
        f"Use {composition}. "
        f"{distance} "
        f"Lighting: {lighting}. "
        "Create a sharp photorealistic adoption photo with crisp eyes, detailed fur texture, natural paws, and realistic anatomy. "
        "Make it feel warm, premium, and trustworthy, like a professional pet adoption editorial photo. "
        "Change the room and allow only a mild natural camera shift. "
        "Remove any text overlay, watermark, logo, graphic sticker, collage elements, or captions from the reference. "
        "Show only one pet. No blur, no haze, no duplicate limbs, no distorted face, no extra animals."
    )


def _build_variants(output_size: str) -> list[dict]:
    """Цепочка попыток от лучшей модели к запасным.

    gpt-image-2 сам обрабатывает вход в high fidelity, поэтому input_fidelity
    для него не передаётся — с этим параметром запрос падает.
    На старых моделях input_fidelity всегда high: low подменяет животное.
    """
    return [
        {"model": "gpt-image-2", "quality": IMAGE_QUALITY, "size": output_size},
        {"model": "gpt-image-2", "quality": IMAGE_QUALITY, "size": "1024x1024"},
        {
            "model": "gpt-image-1.5",
            "quality": IMAGE_QUALITY,
            "size": output_size,
            "input_fidelity": "high",
        },
        {
            "model": "gpt-image-1",
            "quality": IMAGE_QUALITY,
            "size": output_size,
            "input_fidelity": "high",
        },
    ]


async def _edit_single_image(
    reference: tuple[str, bytes, str],
    prompt: str,
    output_size: str,
) -> bytes:
    global _working_model

    variants = _build_variants(output_size)
    if _working_model is not None:
        variants = [v for v in variants if v["model"] == _working_model] or variants

    last_error: Exception | None = None
    for index, variant in enumerate(variants, 1):
        params = {
            "model": variant["model"],
            "image": reference,
            "prompt": prompt,
            "quality": variant["quality"],
            "output_format": "png",
            "size": variant["size"],
            "timeout": 240,
        }
        if "input_fidelity" in variant:
            params["input_fidelity"] = variant["input_fidelity"]

        try:
            response = await client.images.edit(**params)
            _working_model = variant["model"]
            return base64.b64decode(response.data[0].b64_json)
        except APIError as exc:
            last_error = exc
            logging.warning(
                "Edit attempt %s (%s) failed, falling back: %s",
                index,
                variant["model"],
                exc,
            )
            await asyncio.sleep(1.5)

    if last_error is not None:
        raise last_error
    raise RuntimeError("No image generation attempts were made")


async def generate_images(
    photo_bytes: bytes, animal_data: dict, count: int = 3
) -> list[bytes]:
    """Generate faithful interior variations that keep the same pet identity."""
    total = max(1, min(count, 4))
    reference, output_size = _build_reference(photo_bytes)
    shot_variants = SHOT_VARIANTS[:]
    random.shuffle(shot_variants)

    results: list[bytes] = []
    max_attempts = total + 4
    for attempt in range(max_attempts):
        if len(results) >= total:
            break

        shot = shot_variants[min(len(results), len(shot_variants) - 1)]
        prompt = _build_prompt(
            animal_data=animal_data,
            background=random.choice(BACKGROUNDS),
            composition=shot["composition"],
            distance=shot["distance"],
            lighting=random.choice(LIGHTING),
        )

        try:
            results.append(await _edit_single_image(reference, prompt, output_size))
        except APIError as exc:
            logging.warning("Skipping one image after repeated API failures: %s", exc)

    return results
