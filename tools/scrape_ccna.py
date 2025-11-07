# -*- coding: utf-8 -*-
"""
Tentative de récupération des questions/réponses depuis la page fournie.
ATTENTION: Avant toute utilisation réelle, vérifiez vous-même les conditions d'utilisation du site source.
Ce script:
 - Télécharge la page HTML.
 - Cherche des blocs de texte qui ressemblent à des questions suivies de réponses.
 - Produit un JSON approximatif (data/modules-1-3.json) à réviser manuellement.

Limites:
 - Parsing heuristique fragile.
 - Nécessite 'requests' et 'beautifulsoup4'. Installez avec:
     py -m pip install requests beautifulsoup4

Utilisation:
   py tools/scrape_ccna_modules_1_3.py
"""
import re
import json
import argparse
from urllib.parse import urlparse
from pathlib import Path

DEFAULT_URL = "https://ccnareponses.com/modules-1-3-examen-sur-la-connectivite-des-reseaux-de-base-et-les-communications-reponses/"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / 'data' / 'modules-1-3.json'

# Lazy import so script fails gracefully if deps missing
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Dépendances manquantes. Installez: py -m pip install requests beautifulsoup4")
    raise SystemExit(2)

QUESTION_REGEX = re.compile(r"^\s*\d+\.|^Question\s*\d+", re.IGNORECASE)


def fetch_html(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.text


def extract_container(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    # Prefer exact id; fallback to partial match
    container = soup.find(id='Ccnareponses_Incontent_1')
    if not container:
        container = soup.find('div', id=lambda x: x and 'Ccnareponses_Incontent_1' in x)
    if not container:
        container = soup.find('div', class_=lambda c: c and 'Ccnareponses_Incontent_1' in (c if isinstance(c, str) else ' '.join(c)))
    return container


def parse_qa_from_container(container):
    """Parse questions/answers inside the provided container.
    Pattern observed:
      <p><strong>Question text</strong></p>
      [optional <figure> with <img>]
      <ul>
        <li>Answer A</li>
        <li class="correct_answer">Answer B</li>
        ...
      </ul>
      <div class="message_box announce">... explanation ...</div>
    Repeat.
    """
    results = []

    def is_question_anchor(tag):
        if not getattr(tag, 'name', None):
            return False
        if tag.name in ('p', 'h2', 'h3', 'h4') and tag.find('strong'):
            return True
        return False

    anchors = [t for t in container.find_all(['p', 'h2', 'h3', 'h4']) if is_question_anchor(t)]
    for q_p in anchors:
        strong = q_p.find('strong')
        question_text = strong.get_text(" ", strip=True) if strong else q_p.get_text(" ", strip=True)

        # Scan forward through siblings until the next <p><strong> is encountered
        image_url = None
        answer_list = None
        for sib in q_p.next_siblings:
            if is_question_anchor(sib):
                break
            if getattr(sib, 'name', None) in ('figure', 'div') and image_url is None:
                img = sib.find('img') if getattr(sib, 'find', None) else None
                if img and img.get('src'):
                    image_url = img['src']
            if getattr(sib, 'name', None) in ('ul', 'ol') and answer_list is None:
                answer_list = sib

        answers = []
        correct = []
        if answer_list:
            for i, li in enumerate(answer_list.find_all('li', recursive=False)):
                txt = li.get_text(" ", strip=True)
                if not txt:
                    continue
                answers.append(txt)
                classes = li.get('class') or []
                if 'correct_answer' in classes:
                    correct.append(i)

        # Only add entries with some answers; some blocks may be statements or images only
        if question_text and answers:
            results.append({
                'question': question_text,
                'answers': answers,
                'correctAnswers': correct,
                'image': image_url,
                'type': 'image' if image_url else 'text'
            })

    return results


def assign_ids(items):
    for i, it in enumerate(items, start=1):
        it['id'] = i
    return items


def derive_out_from_url(url: str) -> Path:
    data_dir = Path(__file__).resolve().parents[1] / 'data'
    slug = urlparse(url).path.rstrip('/').split('/')[-1]
    # Try to extract 'modules-<numbers>' pattern
    m = re.search(r"(modules?-\d+(?:-\d+)*)", slug, flags=re.IGNORECASE)
    base = (m.group(1).lower() if m else slug.lower()) or 'scraped'
    # Sanitize filename
    base = re.sub(r"[^a-z0-9\-_.]+", "-", base)
    return data_dir / f"{base}.json"


def main():
    parser = argparse.ArgumentParser(description="Scrape CCNA questions into JSON.")
    parser.add_argument('--url', '-u', default=DEFAULT_URL, help='URL de la page à scraper')
    parser.add_argument('--out', '-o', default=None, help="Chemin du fichier JSON de sortie (défaut: dérivé de l'URL)")
    args = parser.parse_args()

    url = args.url
    out_path = Path(args.out) if args.out else derive_out_from_url(url)

    print(f"Téléchargement: {url}")
    html = fetch_html(url)
    print("Extraction dans le conteneur principal...")
    container = extract_container(html)
    if not container:
        print("Conteneur introuvable: Ccnareponses_Incontent_1")
        # Continue; we'll fallback to page-level parsing below
    # Debug infos
    try:
        if container:
            strong_count = len(container.find_all('strong'))
            ul_count = len(container.find_all('ul'))
            corr_count = len(container.find_all('li', class_='correct_answer'))
            print(f"Debug: strong={strong_count}, ul={ul_count}, correct_li={corr_count}")
    except Exception:
        pass
    data = parse_qa_from_container(container) if container else []
    if not data:
        # Fallback: try parsing entire document
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        try:
            print("Fallback: parse page-level content")
            print(f"Page debug: strong={len(soup.find_all('strong'))}, ul={len(soup.find_all('ul'))}, correct_li={len(soup.find_all('li', class_='correct_answer'))}")
        except Exception:
            pass
        data = parse_qa_from_container(soup)
    data = assign_ids(data)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Écrit {len(data)} questions approximatives dans {out_path}. Complétez les 'correctAnswers' manuellement.")
    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
