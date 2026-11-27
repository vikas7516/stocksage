"""Shared Gemini API client with automatic retry/backoff and secondary Gemini model fallback."""

import json
import random
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar
import httpx
from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_FALLBACK_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
]


def _strip_fences(raw: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _candidate_models() -> List[str]:
    models = [settings.gemini_model]
    for m in _FALLBACK_MODELS:
        if m not in models:
            models.append(m)
    return models


def _extract_answer_text(resp_json: Dict[str, Any]) -> str:
    candidates = resp_json.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_parts = [p.get("text", "") for p in parts if not p.get("thought") and p.get("text")]
    return "\n".join(text_parts).strip()


def _generation_config_for(model_id: str, temperature: float, max_tokens: int, json_mode: bool) -> Dict[str, Any]:
    cfg: Dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": max_tokens,
    }
    if json_mode:
        cfg["responseMimeType"] = "application/json"
    # Gemini 3.x uses thinkingLevel; Gemini 2.5 Flash models use thinkingBudget or default
    if "3." in model_id or "3-" in model_id:
        cfg["thinkingConfig"] = {"thinkingLevel": "high"}
    return cfg


def call_llm_structured(
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    temperature: float = 0.25,
    max_tokens: int = 2048,
) -> Tuple[Optional[T], Optional[str], int]:
    """
    Calls Gemini API (`gemini-3.1-flash-lite`) with retry/backoff on transient 503/429
    and automatic fallback to secondary Gemini models if demand spikes persist.
    """
    start = time.perf_counter()
    if not settings.gemini_api_key:
        return None, "GEMINI_API_KEY is not configured.", 0

    last_err = None
    with httpx.Client(timeout=25.0) as client:
        for model_idx, model_id in enumerate(_candidate_models()):
            url = f"{_GEMINI_BASE}/{model_id}:generateContent"
            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": _generation_config_for(model_id, temperature, max_tokens, json_mode=True),
            }

            # Up to 2 attempts on primary model with short jittered backoff on 503/429
            attempts = 2 if model_idx == 0 else 1
            for attempt in range(attempts):
                try:
                    resp = client.post(
                        url,
                        headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                        json=payload,
                    )
                    if resp.status_code == 200:
                        raw_text = _extract_answer_text(resp.json())
                        parsed = json.loads(_strip_fences(raw_text or "{}"))
                        validated = schema_cls.model_validate(parsed)
                        elapsed_ms = int((time.perf_counter() - start) * 1000)
                        return validated, None, elapsed_ms

                    last_err = f"HTTP {resp.status_code}: {resp.text[:250]}"
                    if resp.status_code in (429, 503):
                        if attempt < attempts - 1:
                            time.sleep(0.8 + random.uniform(0.2, 0.7))
                            continue
                        break  # Try next fallback model
                    if resp.status_code in (400, 404):
                        break  # Model alias mismatch or config mismatch -> try next model
                    break
                except Exception as exc:
                    last_err = str(exc)
                    if attempt < attempts - 1:
                        time.sleep(0.6)
                        continue
                    break

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return None, last_err, elapsed_ms


def call_llm_chat(
    system_prompt: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.35,
    max_tokens: int = 1200,
) -> Tuple[str, Optional[str], int]:
    """Calls Gemini API for grounded follow-up chat with retry & model fallback."""
    start = time.perf_counter()
    if not settings.gemini_api_key:
        return (
            "Live chat is unavailable right now because the backend API key is not configured.",
            "Missing GEMINI_API_KEY",
            0,
        )

    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in messages
    ]

    last_err = None
    with httpx.Client(timeout=25.0) as client:
        for model_idx, model_id in enumerate(_candidate_models()):
            url = f"{_GEMINI_BASE}/{model_id}:generateContent"
            payload = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": _generation_config_for(model_id, temperature, max_tokens, json_mode=False),
            }
            attempts = 2 if model_idx == 0 else 1
            for attempt in range(attempts):
                try:
                    resp = client.post(
                        url,
                        headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                        json=payload,
                    )
                    if resp.status_code == 200:
                        answer = _extract_answer_text(resp.json())
                        elapsed_ms = int((time.perf_counter() - start) * 1000)
                        return answer or "No response returned.", None, elapsed_ms

                    last_err = f"HTTP {resp.status_code}: {resp.text[:250]}"
                    if resp.status_code in (429, 503):
                        if attempt < attempts - 1:
                            time.sleep(0.8 + random.uniform(0.2, 0.7))
                            continue
                        break
                    if resp.status_code in (400, 404):
                        break
                    break
                except Exception as exc:
                    last_err = str(exc)
                    if attempt < attempts - 1:
                        time.sleep(0.6)
                        continue
                    break

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return "The AI model is temporarily busy due to high demand. Please ask again in a few seconds.", last_err, elapsed_ms
