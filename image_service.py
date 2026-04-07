import asyncio
import base64
import logging
import random
from io import BytesIO

from PIL import Image, ImageOps
from openai import APIError, AsyncOpenAI

from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY, max_retries=3)

IMAGE_MODEL = "gpt-image-1"

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
        "composition": "a clean medium portrait with the full head and upper body visible",
        "distance": "The camera is fairly close, but not extreme. The pet should occupy about 40 percent of the frame.",
    },
    {
        "composition": "a full-body shot with the pet naturally sitting or standing in the room",
        "distance": "The camera is a bit farther back. The full body should be visible and the pet should occupy about 28 percent of the frame.",
    },
    {
        "composition": "a wider environmental shot from farther away with the pet clearly placed in the interior",
        "distance": "Show much more of the room around the pet. The pet should occupy only about 18 to 22 percent of the frame.",
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


def _normalize_image(photo_bytes: bytes, max_size: int = 768) -> Image.Image:
    with Image.open(BytesIO(photo_bytes)) as image:
        normalized = ImageOps.exif_transpose(image).convert("RGB")
        if max(normalized.size) > max_size:
            normalized.thumbnail((max_size, max_size))
        return normalized.copy()


def _image_to_png_bytes(image: Image.Image) -> bytes:
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def _make_focus_crop(image: Image.Image) -> Image.Image:
    width, height = image.size
    crop_size = int(min(width, height) * 0.82)
    left = max((width - crop_size) // 2, 0)
    top = max((height - crop_size) // 2 - int(crop_size * 0.08), 0)

    if left + crop_size > width:
        left = width - crop_size
    if top + crop_size > height:
        top = height - crop_size

    cropped = image.crop((left, top, left + crop_size, top + crop_size))
    return cropped.resize((512, 512), Image.Resampling.LANCZOS)


def _build_reference_images(photo_bytes: bytes) -> list[tuple[str, bytes, str]]:
    normalized = _normalize_image(photo_bytes, max_size=768)
    full_png = _image_to_png_bytes(normalized)
    focus_png = _image_to_png_bytes(_make_focus_crop(normalized))

    return [
        ("reference_full.png", full_png, "image/png"),
        ("reference_focus.png", focus_png, "image/png"),
    ]


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
        "Use the uploaded reference image or images as the exact same real pet identity. "
        "Preserve the exact face, muzzle, nose shape, eyes, ear shape, fur pattern, markings, coat color, proportions, and overall identity. "
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


async def _edit_single_image(
    reference_images: list[tuple[str, bytes, str]],
    prompt: str,
) -> bytes:
    variants = [
        {"image": reference_images, "input_fidelity": "high", "quality": "medium"},
        {"image": reference_images[0], "input_fidelity": "high", "quality": "medium"},
        {"image": reference_images[0], "input_fidelity": "high", "quality": "low"},
        {"image": reference_images[0], "input_fidelity": "low", "quality": "medium"},
    ]

    last_error: Exception | None = None
    for index, variant in enumerate(variants, 1):
        try:
            response = await client.images.edit(
                model=IMAGE_MODEL,
                image=variant["image"],
                prompt=prompt,
                input_fidelity=variant["input_fidelity"],
                quality=variant["quality"],
                output_format="png",
                size="1024x1024",
                timeout=120,
            )
            return base64.b64decode(response.data[0].b64_json)
        except APIError as exc:
            last_error = exc
            logging.warning(
                "Reference edit attempt %s failed, retrying with a lighter request: %s",
                index,
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
    reference_images = _build_reference_images(photo_bytes)
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
            results.append(await _edit_single_image(reference_images, prompt))
        except APIError as exc:
            logging.warning("Skipping one image after repeated API failures: %s", exc)

    return results
