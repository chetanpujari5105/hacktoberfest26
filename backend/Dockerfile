FROM python:3.12-slim

# openssh-client: `jl exec` shells out to ssh to probe the GPU box
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv==0.11.29 \
    && useradd --create-home --uid 1000 app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/tmp/matplotlib \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY api ./api
COPY guard ./guard
COPY llm ./llm
COPY providers ./providers
COPY config.py logsetup.py worker.py ./

USER app
EXPOSE 8000
CMD ["uvicorn", "api.main:build", "--factory", "--host", "0.0.0.0", "--port", "8000"]
