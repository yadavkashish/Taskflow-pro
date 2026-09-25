"""Development configuration loaded by the backend process, not the frontend."""

from pathlib import Path

from dotenv import load_dotenv


# Do not override a deployment-provided environment variable with local .env.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
