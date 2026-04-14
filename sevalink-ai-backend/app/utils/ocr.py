"""
ocr.py — Tesseract OCR + Simple regex extraction for paper survey digitization.
Parses raw OCR text and extracts structured Need fields automatically.
"""

import re


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Runs Tesseract OCR on an uploaded image and returns raw extracted text.
    Requires: pip install pytesseract Pillow
    Also requires Tesseract binary installed on the system.
    Windows: https://github.com/UB-Mannheim/tesseract/wiki
    """
    try:
        import pytesseract
        from PIL import Image
        import io

        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text
    except ImportError:
        raise RuntimeError("pytesseract or Pillow not installed. Run: pip install pytesseract Pillow")
    except Exception as e:
        raise RuntimeError(f"OCR processing failed: {e}")


def parse_need_from_text(raw_text: str) -> dict:
    """
    Applies simple regex keyword extraction to OCR'd text and produces a
    structured NeedCreate-compatible dictionary.

    Example input (from a handwritten/printed survey):
        Location: Ahmedabad
        Type of Need: Water
        People Affected: 300
        Urgency: High
    """
    result = {
        "community_id": 999,  # Default sentinel for OCR-sourced records
        "location": "Unknown",
        "need_type": "General",
        "people_affected": 0,
        "urgency_level": "Medium",
    }

    # ── Location ─────────────────────────────────────────────────
    loc_match = re.search(
        r"(?:location|area|region|sector|district)[:\-\s]+([A-Za-z\s]+)",
        raw_text, re.IGNORECASE
    )
    if loc_match:
        result["location"] = loc_match.group(1).strip().title()

    # ── Need Type ─────────────────────────────────────────────────
    need_keywords = {
        "Water": ["water", "drinking", "flood", "sanitation"],
        "Medical": ["medical", "medicine", "health", "doctor", "nurse", "hospital", "clinic"],
        "Food": ["food", "ration", "hunger", "meal", "cook"],
        "Education": ["education", "school", "teaching", "children", "literacy"],
    }
    lower_text = raw_text.lower()
    for need_type, keywords in need_keywords.items():
        if any(k in lower_text for k in keywords):
            result["need_type"] = need_type
            break

    # ── People Affected ───────────────────────────────────────────
    people_match = re.search(
        r"(?:people|affected|persons|residents|families|individuals)[:\-\s]*(\d+)",
        raw_text, re.IGNORECASE
    )
    if people_match:
        result["people_affected"] = int(people_match.group(1))

    # ── Urgency ──────────────────────────────────────────────────
    urgency_match = re.search(
        r"(?:urgency|priority|severity)[:\-\s]*(critical|high|medium|low)",
        raw_text, re.IGNORECASE
    )
    if urgency_match:
        result["urgency_level"] = urgency_match.group(1).capitalize()

    return result
