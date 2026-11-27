"""Shared Gemini API client for structured JSON agent outputs and follow-up chat."""

import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar
import httpx
from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
_MODEL_ALIASES = ["gemini-3.1-flash-lite", "gemini-3.1-flash-lite-preview"]


def _strip_fences(raw: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _candidate_models() -> List[str]:
    models = [settings.gemini_model]
    for m in _MODEL_ALIASES:
        if m not in models:
            models.append(m)
    return models


def _extract_answer_text(resp_json: Dict[str, Any]) -> str:
    candidates = resp_json.get("candidates") or []
    if not candidates:
        return ""
    parts = (candidates[0].get("content") or {}).get("parts") or []
    # Skip Gemini thought blocks so thinking tokens never mix with final output
    text_parts = [p.get("text", "") for p in parts if not p.get("thought") and p.get("text")]
    return "\n".join(text_parts).strip()


def call_llm_structured(
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    temperature: float = 0.25,
    max_tokens: int = 2048,
) -> Tuple[Optional[T], Optional[str], int]:
    """
    Calls Gemini API (`gemini-3.1-flash-lite`) with JSON output mode and high thinking level,
    validating against `schema_cls`.
    Returns (validated_model_or_None, error_message_or_None, latency_ms).
    """
    start = time.perf_counter()
    if not settings.gemini_api_key:
        return None, "GEMINI_API_KEY is not configured.", 0

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "thinkingConfig": {"thinkingLevel": "high"},
        },
    }

    last_err = None
    with httpx.Client(timeout=20.0) as client:
        for model_id in _candidate_models():
            url = f"{_GEMINI_BASE}/{model_id}:generateContent"
            try:
                resp = client.post(
                    url,
                    headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                    json=payload,
                )
                if resp.status_code != 200:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:250]}"
                    if resp.status_code in (404, 429, 503):
                        continue
                    break

                raw_text = _extract_answer_text(resp.json())
                parsed = json.loads(_strip_fences(raw_text or "{}"))
                validated = schema_cls.model_validate(parsed)
                elapsed_ms = int((time.perf_counter() - start) * 1000)
                return validated, None, elapsed_ms
            except Exception as exc:
                last_err = str(exc)
                continue

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return None, last_err, elapsed_ms


def call_llm_chat(
    system_prompt: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.35,
    max_tokens: int = 1200,
) -> Tuple[str, Optional[str], int]:
    """Calls Gemini API for grounded conversational follow-ups in the Agent Sidebar."""
    start = time.perf_counter()
    if not settings.gemini_api_key:
        return (
            "GEMINI_API_KEY is not configured on the backend, so live AI replies are unavailable.",
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

    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
            "thinkingConfig": {"thinkingLevel": "high"},
        },
    }

    last_err = None
    with httpx.Client(timeout=20.0) as client:
        for model_id in _candidate_models():
            url = f"{_GEMINI_BASE}/{model_id}:generateContent"
            try:
                resp = client.post(
                    url,
                    headers={"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"},
                    json=payload,
                )
                if resp.status_code != 200:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:250]}"
                    if resp.status_code in (404, 429, 503):
                        continue
                    break

                answer = _extract_answer_text(resp.json())
                elapsed_ms = int((time.perf_counter() - start) * 1000)
                return answer or "No response returned.", None, elapsed_ms
            except Exception as exc:
                last_err = str(exc)
                continue

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return f"Unable to reach Gemini API ({settings.gemini_model}): {last_err}", last_err, elapsed_ms
