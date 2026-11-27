"""Shared Groq LLM helper for structured JSON outputs and grounded follow-up chat."""

import json
import re
import time
from typing import Dict, List, Optional, Tuple, Type, TypeVar
from groq import Groq
from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

# Ordered fallback models in the Groq org if the primary hits its 1,000 OTPM free-tier cap
_FALLBACK_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]


def _strip_think_and_fences(raw: str) -> str:
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _candidate_models() -> List[str]:
    models = [settings.groq_model]
    for m in _FALLBACK_MODELS:
        if m not in models:
            models.append(m)
    return models


def call_groq_structured(
    system_prompt: str,
    user_prompt: str,
    schema_cls: Type[T],
    temperature: float = 0.2,
    max_tokens: int = 900,
) -> Tuple[Optional[T], Optional[str], int]:
    """
    Calls Groq chat completions in JSON mode and validates against `schema_cls`.
    Automatically falls back to secondary Groq models if the primary hits a 429 rate limit.
    Returns (validated_model_or_None, error_message_or_None, latency_ms).
    """
    start = time.perf_counter()
    if not settings.groq_api_key:
        return None, "GROQ_API_KEY is not configured.", 0

    client = Groq(api_key=settings.groq_api_key, max_retries=0)
    last_err = None

    for model_id in _candidate_models():
        try:
            resp = client.chat.completions.create(
                model=model_id,
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
            last_err = str(exc)
            # Retry with next Groq model on 429 rate-limit or JSON generation failure
            if "429" in last_err or "rate_limit" in last_err.lower() or "json_validate_failed" in last_err:
                continue
            break

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return None, last_err, elapsed_ms


def call_groq_chat(
    system_prompt: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    max_tokens: int = 600,
) -> Tuple[str, Optional[str], int]:
    """Calls Groq for grounded conversational follow-ups in the Agent Sidebar."""
    start = time.perf_counter()
    if not settings.groq_api_key:
        return (
            "GROQ_API_KEY is not configured on the backend, so live AI chat replies are unavailable.",
            "Missing GROQ_API_KEY",
            0,
        )

    client = Groq(api_key=settings.groq_api_key, max_retries=0)
    last_err = None

    for model_id in _candidate_models():
        try:
            resp = client.chat.completions.create(
                model=model_id,
                messages=[{"role": "system", "content": system_prompt}, *messages],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = _strip_think_and_fences(resp.choices[0].message.content or "")
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            return content, None, elapsed_ms
        except Exception as exc:
            last_err = str(exc)
            if "429" in last_err or "rate_limit" in last_err.lower():
                continue
            break

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return (
        "Groq free-tier rate limit reached (tokens/min). Wait a few seconds and try your question again.",
        last_err,
        elapsed_ms,
    )
