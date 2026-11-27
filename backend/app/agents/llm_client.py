"""Shared Groq LLM helper for structured JSON outputs and grounded follow-up chat."""

import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar
from groq import Groq
from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


def _strip_think_and_fences(raw: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def call_groq_structured(
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    temperature: float = 0.2,
    max_tokens: int = 900,
) -> Tuple[Optional[T], Optional[str], int]:
    """
    Calls Groq chat completions in JSON mode and validates against `schema_cls`.
    Returns (validated_model_or_None, error_message_or_None, latency_ms).
    """
    start = time.perf_counter()
    if not settings.groq_api_key:
        return None, "GROQ_API_KEY is not configured.", 0

    try:
        client = Groq(api_key=settings.groq_api_key, max_retries=1)
        resp = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=max_tokens,
        )
        raw_content = resp.choices[0].message.content or "{}"
        parsed = json.loads(_strip_think_and_fences(raw_content))
        validated = schema_cls.model_validate(parsed)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return validated, None, elapsed_ms
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return None, str(exc), elapsed_ms


def call_groq_chat(
    system_prompt: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 600,
) -> Tuple[str, Optional[str], int]:
    """Calls Groq for grounded conversational follow-ups in the Agent Chat sidebar."""
    start = time.perf_counter()
    if not settings.groq_api_key:
        return (
            "GROQ_API_KEY is not configured on the backend, so live AI chat replies are unavailable.",
            "Missing GROQ_API_KEY",
            0,
        )

    try:
        client = Groq(api_key=settings.groq_api_key, max_retries=1)
        resp = client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        content = _strip_think_and_fences(resp.choices[0].message.content or "")
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return content, None, elapsed_ms
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        msg = str(exc)
        if "429" in msg or "rate_limit" in msg.lower():
            return (
                "Groq free-tier rate limit reached (tokens/min). Wait a few seconds and try your question again.",
                msg,
                elapsed_ms,
            )
        return f"Unable to reach Groq ({settings.groq_model}): {msg}", msg, elapsed_ms
