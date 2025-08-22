import re
from typing import Dict, Optional

import anyio
import requests
from bs4 import BeautifulSoup


def _fetch(url: str) -> tuple[str, Optional[str]]:
    resp = requests.get(url, timeout=20, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    })
    resp.raise_for_status()

    # Parse HTML
    try:
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception:
        soup = BeautifulSoup(resp.text, "html.parser")

    # Remove scripts/styles/nav/footer
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Try to prefer article/main content if present
    main = soup.find(["article", "main"]) or soup.body
    text = main.get_text(separator=" ", strip=True) if main else soup.get_text(separator=" ", strip=True)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text or "").strip()
    return text, title


async def fetch_and_extract(url: str) -> Dict[str, Optional[str]]:
    text, title = await anyio.to_thread.run_sync(_fetch, url)
    return {"text": text, "title": title}
