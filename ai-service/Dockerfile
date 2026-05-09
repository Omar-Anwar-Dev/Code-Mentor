# AI Analysis Service — Docker image (S5-T6: all 6 analyzer toolchains bundled)
#
# Installed analyzers:
#   ESLint   (JS/TS)  — npm global
#   Bandit   (Python) — pip (requirements.txt)
#   Cppcheck (C/C++)  — apt
#   PHPStan  (PHP)    — phar file at /usr/local/bin/phpstan
#   PMD      (Java)   — /opt/pmd/bin/pmd
#   Roslyn   (C#)     — via `dotnet format` from .NET 8 SDK
#
# Image size trade-off: ~2 GB uncompressed. Worth it — the thesis claims 6-language
# coverage and the analyzers are the core value prop of the AI service layer.

FROM python:3.11-bookworm

WORKDIR /app

# ---- System tools: curl, wget, unzip, git, cppcheck, java, php, node ----
# Single apt layer keeps the image smaller.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        wget \
        unzip \
        git \
        ca-certificates \
        gnupg \
        cppcheck \
        default-jre-headless \
        php-cli \
    && rm -rf /var/lib/apt/lists/*

# ---- Node.js 20 + ESLint ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g eslint@9 \
    && npm cache clean --force

# ---- .NET 8 SDK (for Roslyn-backed `dotnet format`) ----
RUN wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/pm.deb \
    && dpkg -i /tmp/pm.deb \
    && rm /tmp/pm.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends dotnet-sdk-8.0 \
    && rm -rf /var/lib/apt/lists/*

# ---- PMD 7 (Java) ----
ENV PMD_VERSION=7.8.0
RUN curl -fsSL -o /tmp/pmd.zip \
        https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip \
    && unzip -q /tmp/pmd.zip -d /opt \
    && mv /opt/pmd-bin-${PMD_VERSION} /opt/pmd \
    && ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd \
    && rm /tmp/pmd.zip

# ---- PHPStan phar ----
RUN curl -fsSL -o /usr/local/bin/phpstan \
        https://github.com/phpstan/phpstan/releases/latest/download/phpstan.phar \
    && chmod +x /usr/local/bin/phpstan

# ---- Python deps ----
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Application ----
COPY . .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
