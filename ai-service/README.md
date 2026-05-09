# 🧠 Code Mentor — AI Analysis Layer

> AI-powered code analysis microservice for the **Code Mentor** platform.  
> Combines static analysis tools with OpenAI GPT code review to deliver comprehensive, educational feedback to learners.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [Supported Languages](#supported-languages)
- [License](#license)

---

## Overview

The **AI Analysis Layer** is a FastAPI microservice that serves as the intelligent backend for the Code Mentor platform. It performs two complementary types of analysis on submitted source code:

1. **Static Analysis** — Runs industry-standard linting and security tools (ESLint, Bandit, Cppcheck, PHPStan, PMD) to catch bugs, style violations, and vulnerabilities.
2. **AI Code Review** — Leverages OpenAI's GPT models to generate human-like, educational feedback including strengths, weaknesses, recommendations, and learning resources.

Results are unified into a single response with scored categories, detailed issue breakdowns, and actionable improvement suggestions.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FastAPI Application                │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  /health   │  │ /api/analyze│  │ /api/ai-review│  │
│  └────────────┘  │ /api/       │  └───────┬───────┘  │
│                  │ analyze-zip │          │          │
│                  └──────┬──────┘          │          │
│                         │                │          │
│              ┌──────────▼──────────┐     │          │
│              │ Analysis Orchestrator│◄────┘          │
│              └──────────┬──────────┘                │
│         ┌───────────────┼───────────────┐           │
│         ▼               ▼               ▼           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Static    │ │     AI      │ │    PDF      │   │
│  │  Analyzers  │ │   Reviewer  │ │  Generator  │   │
│  │ (ESLint,    │ │  (OpenAI)   │ │ (ReportLab) │   │
│  │  Bandit,    │ │             │ │             │   │
│  │  Cppcheck…) │ │             │ │             │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         static/index.html (Web Test UI)       │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer         | Technology                                      |
| ------------- | ----------------------------------------------- |
| **Framework** | FastAPI 0.109+                                  |
| **Server**    | Uvicorn (ASGI)                                  |
| **AI Model**  | OpenAI GPT-5.1-codex-mini                       |
| **Validation**| Pydantic v2                                     |
| **PDF**       | ReportLab                                       |
| **Static Analysis** | ESLint · Bandit · Cppcheck · PHPStan · PMD |
| **Container** | Docker (Python 3.11-slim + Node.js 20)          |

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 20+** (for ESLint)
- **OpenAI API Key**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Omar-Anwar-Dev/code-mentor-ai.git
cd ai_analysis_layer

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
copy .env.example .env
# Edit .env and add your OpenAI API key
```

### Running the Server

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Or using Python directly
python -m app.main
```

The server will start at **http://localhost:8001**

- **Web Test UI** → http://localhost:8001/static/index.html
- **Swagger Docs** → http://localhost:8001/docs
- **ReDoc** → http://localhost:8001/redoc

---

## Configuration

All configuration is managed through environment variables with the `AI_ANALYSIS_` prefix.  
Copy `.env.example` to `.env` and customize:

| Variable                        | Default               | Description                       |
| ------------------------------- | --------------------- | --------------------------------- |
| `AI_ANALYSIS_OPENAI_API_KEY`    | *(required)*          | Your OpenAI API key               |
| `AI_ANALYSIS_OPENAI_MODEL`      | `gpt-5.1-codex-mini`  | OpenAI model for code review      |
| `AI_ANALYSIS_AI_TIMEOUT`        | `180`                 | AI request timeout (seconds)      |
| `AI_ANALYSIS_AI_MAX_TOKENS`     | `8192`                | Max tokens for AI response        |
| `AI_ANALYSIS_HOST`              | `0.0.0.0`             | Server host                       |
| `AI_ANALYSIS_PORT`              | `8001`                | Server port                       |
| `AI_ANALYSIS_DEBUG`             | `false`               | Enable debug mode                 |
| `AI_ANALYSIS_ANALYSIS_TIMEOUT`  | `180`                 | Static analysis timeout (seconds) |
| `AI_ANALYSIS_MAX_FILE_SIZE`     | `1048576`             | Max file size in bytes (1 MB)     |
| `AI_ANALYSIS_MAX_FILES`         | `50`                  | Max files per submission          |

---

## API Endpoints

### Health Check

| Method | Endpoint   | Description                |
| ------ | ---------- | -------------------------- |
| `GET`  | `/health`  | Service health status      |

### Analysis

| Method | Endpoint            | Description                                          |
| ------ | ------------------- | ---------------------------------------------------- |
| `POST` | `/api/analyze`      | Run static analysis on submitted code                |
| `POST` | `/api/analyze-zip`  | Upload a ZIP file for combined static + AI analysis  |
| `POST` | `/api/ai-review`    | Run standalone AI code review                        |

### Documentation

| Method | Endpoint         | Description            |
| ------ | ---------------- | ---------------------- |
| `GET`  | `/docs`          | Swagger UI             |
| `GET`  | `/redoc`         | ReDoc documentation    |
| `GET`  | `/openapi.json`  | OpenAPI specification  |

---

## Testing

The application is tested using the **built-in Web Test UI** served at:

```
http://localhost:8001/static/index.html
```

This interactive interface allows you to:

- 📁 **Upload ZIP files** containing source code via drag-and-drop or file picker
- ⚙️ **Trigger combined analysis** (static + AI review) with a single click
- 📊 **View detailed results** including scores, category breakdowns, issues, strengths, weaknesses, recommendations, and learning resources
- 📄 **Download PDF reports** of the analysis

> **To test:** Start the server, navigate to the Web UI, upload a ZIP file with source code, and review the analysis results.

---

## Docker Deployment

```bash
# Build the Docker image
docker build -t code-mentor-ai .

# Run the container
docker run -d \
  --name code-mentor-ai \
  -p 8001:8001 \
  -e AI_ANALYSIS_OPENAI_API_KEY=your-api-key-here \
  code-mentor-ai
```

The container includes:
- Python 3.11 runtime
- Node.js 20 with ESLint pre-installed
- All Python dependencies

---

## Project Structure

```
ai_analysis_layer/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Environment-based configuration
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── analysis.py      # Analysis & AI review endpoints
│   │       └── health.py        # Health check endpoint
│   ├── domain/
│   │   ├── __init__.py
│   │   └── schemas/
│   │       ├── requests.py      # Request validation schemas
│   │       └── responses.py     # Response schemas
│   └── services/
│       ├── __init__.py
│       ├── analysis_orchestrator.py  # Orchestrates static + AI analysis
│       ├── ai_reviewer.py           # OpenAI-powered code review
│       ├── prompts.py               # AI system prompts & templates
│       ├── zip_processor.py         # ZIP file extraction & processing
│       ├── pdf_generator.py         # PDF report generation
│       ├── analyzer_base.py         # Base class for static analyzers
│       ├── eslint_analyzer.py       # JavaScript/TypeScript analysis
│       ├── bandit_analyzer.py       # Python security analysis
│       ├── cpp_analyzer.py          # C/C++ analysis (Cppcheck)
│       ├── csharp_analyzer.py       # C# analysis (.NET)
│       ├── java_analyzer.py         # Java analysis (PMD)
│       └── php_analyzer.py          # PHP analysis (PHPStan)
├── static/
│   └── index.html               # Web-based testing UI
├── .env.example                  # Environment variable template
├── Dockerfile                    # Docker container configuration
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

---

## Supported Languages

| Language         | Static Analyzer | AI Review |
| ---------------- | --------------- | --------- |
| Python           | ✅ Bandit       | ✅        |
| JavaScript / TypeScript | ✅ ESLint | ✅        |
| C / C++          | ✅ Cppcheck     | ✅        |
| C#               | ✅ .NET Analyzers| ✅       |
| Java             | ✅ PMD          | ✅        |
| PHP              | ✅ PHPStan      | ✅        |

---

## License

This project is part of the **Code Mentor** graduation project — AI-Powered Learning & Code Review Platform.

---

<p align="center">
  Built with ❤️ by the Code Mentor Team
</p>
