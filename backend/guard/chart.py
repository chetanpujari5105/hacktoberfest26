"""Render the loss curve that Gemma 4 looks at."""

from __future__ import annotations

import io

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

FIGSIZE = (6, 3)
DPI = 100


def render_loss_chart(losses: tuple[float, ...], title: str = "Training loss") -> bytes | None:
    if not losses:
        return None
    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    try:
        ax.plot(range(1, len(losses) + 1), losses, marker="o", markersize=3, linewidth=1.5)
        ax.set_title(title)
        ax.set_xlabel("logged step (most recent on the right)")
        ax.set_ylabel("loss")
        ax.grid(alpha=0.3)
        fig.tight_layout()
        buffer = io.BytesIO()
        fig.savefig(buffer, format="png")
        return buffer.getvalue()
    finally:
        plt.close(fig)
