"""Telegram bot (long polling): turns inline-button taps into Temporal signals.

Lives in the same group as Kepler's bot. It ignores ``/triage`` (Kepler handles it)
and only acts on buttons pressed inside the configured group.

Run: ``python -m api.telegram_bot``
"""

from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, ContextTypes

from config import get_settings
from guard.messages import parse_button_data
from guard.service import RunNotFoundError, RunService
from guard.temporal_client import build_service, connect
from logsetup import configure_logging

logger = logging.getLogger("leaseguard.bot")
LABELS = {
    "pause": "⏸ Pause requested",
    "keep": "▶ Kept running",
    "resolved": "✅ Marked resolved",
    "resume": "▶ Resume requested",
}


def _service(context: ContextTypes.DEFAULT_TYPE) -> RunService:
    return context.application.bot_data["service"]


async def _apply(service: RunService, action: str, run_id: str, extra: str | None) -> None:
    if action in ("pause", "keep", "resolved"):
        await service.decide(run_id, action)  # type: ignore[arg-type]
    elif action == "resume":
        await service.resume(run_id, extra)
    else:
        raise ValueError(f"unknown action {action}")


def _in_group(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> bool:
    group_id = context.application.bot_data["group_id"]
    return bool(group_id) and str(chat_id) == group_id


async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or query.message is None:
        return
    if not _in_group(context, query.message.chat.id):
        await query.answer("Not allowed in this chat.")
        return
    try:
        action, run_id, extra = parse_button_data(query.data or "")
        await _apply(_service(context), action, run_id, extra)
    except ValueError:
        await query.answer("Unknown button.")
        return
    except RunNotFoundError:
        await query.answer("That run is no longer guarded.")
        return
    who = query.from_user.first_name if query.from_user else "someone"
    label = LABELS[action] + (f" on {extra}" if extra else "")
    await query.answer(label)
    await query.edit_message_reply_markup(reply_markup=None)  # prevent double taps
    await query.message.reply_text(f"{label} by {who} for {run_id}")


async def on_chatid(update: Update, _: ContextTypes.DEFAULT_TYPE) -> None:
    """Setup helper: tells you the TELEGRAM_GROUP_ID to configure."""
    if update.effective_message is None or update.effective_chat is None:
        return
    chat = update.effective_chat
    logger.info("chat id requested: %s (%s)", chat.id, chat.type)
    await update.effective_message.reply_text(
        f"This chat's id is {chat.id}\nSet TELEGRAM_GROUP_ID={chat.id} in backend/.env"
    )


async def on_runs(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_message is None or update.effective_chat is None:
        return
    if not _in_group(context, update.effective_chat.id):
        await update.effective_message.reply_text("Run status is only shared in the team group.")
        return
    runs = await _service(context).list_runs()
    if not runs:
        await update.effective_message.reply_text("No runs are being guarded.")
        return
    lines = [
        f"• {r.run_id} {r.name}: {r.status.value}, saved ₹{r.live_savings_inr:.2f}" for r in runs
    ]
    await update.effective_message.reply_text("\n".join(lines))


async def _post_init(application: Application) -> None:
    settings = get_settings()
    application.bot_data["service"] = build_service(await connect(settings), settings)
    application.bot_data["group_id"] = settings.telegram_group_id


def main() -> None:
    configure_logging()
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is required for the bot")
    if not settings.telegram_group_id:
        logger.warning("TELEGRAM_GROUP_ID not set: add the bot to your group and send /chatid")
    application = (
        Application.builder().token(settings.telegram_bot_token).post_init(_post_init).build()
    )
    application.add_handler(CallbackQueryHandler(on_button))
    application.add_handler(CommandHandler("runs", on_runs))
    application.add_handler(CommandHandler("chatid", on_chatid))
    logger.info("LeaseGuard bot polling")
    application.run_polling(allowed_updates=["callback_query", "message"])


if __name__ == "__main__":
    main()
