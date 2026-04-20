import json, time, re, requests
from bs4 import BeautifulSoup

URLS = [
    "https://examenredes.com/ccna-2-v7-examen-final-de-srwe-preguntas-y-respuestas/",
    "https://examenredes.com/examen-final-de-practica-srwe-preguntas-y-respuestas/",
    "https://examenredes.com/ccna-2-preguntas-y-respuestas-srwe-version-7/",
    "https://examenredes.com/modulos-7-9-examen-de-redes-disponibles-y-confiables-respuestas/",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0"}

def clean_text(t):
    t = re.sub(r"^_\d+\.\s*", "", t.strip())
    return re.sub(r"\s+", " ", t).strip()

def scrape_url(url):
    print(f"[->] {url}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"    [ERROR] {e}")
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    results = []
    for p in soup.find_all("p"):
        b = p.find("b")
        if not b or len(b.get_text(strip=True)) < 20:
            continue
        ul = p.find_next_sibling("ul")
        if not ul:
            continue
        correctas = ul.find_all("li", class_="correct_answer")
        if not correctas:
            continue
        q = clean_text(b.get_text(separator=" ", strip=True))
        a = [re.sub(r"\s+", " ", li.get_text(separator=" ", strip=True)) for li in correctas]
        results.append({"q": q, "a": a})
    print(f"    [OK] {len(results)} preguntas")
    return results

def main():
    all_e = []
    for url in URLS:
        all_e.extend(scrape_url(url))
        time.sleep(2)
    seen = {}
    for e in all_e:
        k = e["q"].lower().strip()
        if k not in seen or len(e["a"]) > len(seen[k]["a"]):
            seen[k] = e
    final = [e for e in seen.values() if len(e["q"]) >= 20 and e["a"]]
    with open("database.json", "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=4)
    print(f"\n[DONE] {len(final)} preguntas guardadas en database.json")

main()
