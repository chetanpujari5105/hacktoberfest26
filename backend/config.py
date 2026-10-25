"""Runtime settings, read from environment variables / ``.env``."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Providers
    provider: Literal["jarvislabs", "fake"] = "fake"
    jl_api_key: str = ""
    fake_scenarios: str = Field(default="", description="e.g. '101=converge,102=oom,103=stall'")

    # Remote paths written by demo/train.py on the GPU box
    train_log: str = "~/train.log"
    train_pid: str = "~/train.pid"
    ckpt_flag: str = "~/ckpt.flag"
    ckpt_done: str = "~/ckpt.done"

    # Gemma 4
    # remote = Jarvislabs hosted Model API (pay per token, auth with JL_API_KEY)
    llm: Literal["remote", "local", "off"] = "remote"
    llm_base_url: str = "https://models.jarvislabs.net/v1"
    llm_api_key: str = ""
    llm_model: str = "gemma-4-31b-it"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4:e4b"
    llm_timeout_s: float = 60.0

    # Temporal
    temporal_address: str = "localhost:7233"
    temporal_namespace: str = "default"
    temporal_api_key: str = ""
    task_queue: str = "leaseguard"

    # Telegram
    telegram_bot_token: str = ""
    telegram_group_id: str = ""

    # API
    backend_api_key: str = ""
    default_hourly_cost_inr: float = 38.88

    # Guard policy defaults (lower them for demos, e.g. PROBE_INTERVAL_S=5)
    probe_interval_s: int = 60
    decision_timeout_s: int = 600
    # Seconds per "minute" in dashboard policies; 5 makes a 1-minute check run every 5 s (demo)
    policy_seconds_per_minute: int = Field(default=60, ge=1, le=60)

    # Wallet guard thresholds, in INR (the Jarvislabs wallet currency)
    wallet_warn_inr: float = 800.0
    wallet_critical_inr: float = 250.0
    wallet_interval_s: int = 600

    @model_validator(mode="after")
    def _check_provider_credentials(self) -> Settings:
        if self.provider == "jarvislabs" and not self.jl_api_key:
            raise ValueError("JL_API_KEY is required when PROVIDER=jarvislabs")
        if self.llm == "remote" and not (self.llm_api_key or self.jl_api_key):
            raise ValueError("LLM_API_KEY or JL_API_KEY is required when LLM=remote")
        return self

    @property
    def llm_endpoint(self) -> tuple[str, str, str]:
        """(base_url, api_key, model) for the OpenAI-compatible client."""
        if self.llm == "remote":
            return self.llm_base_url, self.llm_api_key or self.jl_api_key, self.llm_model
        return f"{self.ollama_url.rstrip('/')}/v1", "ollama", self.ollama_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
