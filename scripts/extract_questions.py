"""Extract selected high-difficulty SAT questions from the supplied PDFs.

Question stems are kept as raster excerpts so mathematical notation and source
formatting remain exact. The surrounding exam interface and response controls
are implemented in React.
"""

from __future__ import annotations

import json
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "questions"
DESKTOP = Path.home() / "OneDrive" / "Desktop"


# Nine questions from each source test in every module. The selected Reading
# and Writing items sit at the difficult end of their content groups; Math
# items come from the high-difficulty final third of each module.
SELECTIONS = {
    9: {
        "rw1": [5, 8, 9, 15, 16, 18, 25, 26, 33],
        "rw2": [5, 8, 9, 15, 16, 18, 23, 26, 33],
        "m1": list(range(19, 28)),
        "m2": list(range(19, 28)),
    },
    10: {
        "rw1": [5, 8, 9, 15, 16, 18, 25, 26, 33],
        "rw2": [5, 8, 10, 15, 16, 19, 26, 27, 33],
        "m1": list(range(19, 28)),
        "m2": list(range(19, 28)),
    },
    11: {
        "rw1": [5, 8, 9, 15, 16, 18, 25, 26, 33],
        "rw2": [5, 8, 9, 15, 16, 19, 26, 30, 33],
        "m1": list(range(19, 28)),
        "m2": list(range(19, 28)),
    },
}


PAGE_RANGES = {
    9: {
        "rw1": range(3, 16),
        "rw2": range(17, 30),
        "m1": range(33, 39),
        "m2": range(41, 48),
    },
    10: {
        "rw1": range(3, 16),
        "rw2": range(17, 31),
        "m1": range(33, 42),
        "m2": range(45, 52),
    },
    11: {
        "rw1": range(3, 16),
        "rw2": range(17, 30),
        "m1": range(33, 41),
        "m2": range(43, 51),
    },
}


ANSWER_KEYS = {
    9: {
        "rw1": ["A", "D", "C", "C", "B", "C", "A", "A", "C", "A", "D", "C", "D", "C", "A", "D", "B", "A", "A", "A", "B", "C", "C", "C", "A", "B", "A", "B", "D", "B", "B", "A", "C"],
        "rw2": ["B", "C", "B", "B", "C", "D", "D", "D", "A", "A", "D", "A", "D", "C", "C", "D", "B", "D", "C", "D", "C", "C", "B", "D", "C", "C", "C", "A", "B", "C", "D", "C", "B"],
        "m1": ["B", "C", "B", "A", "A", "9", "224", "A", "C", "B", "A", "B", "40", "14", "C", "D", "B", "D", "D", "52", "-3", "B", "D", "A", "D", "B", "1260"],
        "m2": ["B", "B", "D", "B", "D", "70", "1", "D", "A", "D", "C", "D", "45", "2; -12", "B", "C", "B", "B", "C", "410", "-19", "D", "D", "A", "C", "D", "50"],
    },
    10: {
        "rw1": ["A", "B", "B", "A", "C", "B", "D", "D", "C", "C", "C", "B", "A", "A", "A", "A", "C", "D", "C", "B", "A", "C", "C", "C", "C", "C", "A", "B", "B", "B", "B", "C", "C"],
        "rw2": ["A", "A", "D", "A", "A", "D", "B", "B", "D", "D", "D", "A", "B", "A", "D", "A", "A", "A", "D", "B", "D", "C", "A", "D", "A", "A", "B", "D", "A", "D", "D", "A", "C"],
        "m1": ["C", "A", "D", "A", "D", "77", "25", "C", "B", "B", "B", "B", "1", "76", "A", "D", "D", "A", "A", "35", "113", "A", "C", "C", "D", "A", "29/3; 9.666; 9.667"],
        "m2": ["D", "A", "D", "D", "A", "79", "2", "D", "D", "B", "A", "C", "41", "11875", "B", "B", "B", "A", "C", "5", "0.25; 1/4", "D", "C", "C", "D", "B", "104"],
    },
    11: {
        "rw1": ["A", "C", "D", "D", "A", "B", "B", "D", "D", "C", "B", "D", "A", "D", "B", "A", "D", "D", "D", "D", "A", "B", "B", "A", "D", "D", "D", "A", "A", "C", "A", "D", "B"],
        "rw2": ["C", "C", "C", "D", "B", "B", "B", "A", "B", "C", "B", "D", "C", "B", "C", "C", "A", "A", "B", "B", "B", "B", "B", "B", "A", "B", "D", "B", "C", "B", "C", "A", "A"],
        "m1": ["D", "A", "C", "A", "B", "75", "30", "A", "C", "C", "D", "B", "13", "15000", "A", "A", "C", "B", "D", "100", "29", "B", "B", "A", "C", "B", "3331"],
        "m2": ["C", "B", "D", "D", "A", "8.6; 43/5", "3600", "A", "B", "D", "C", "A", "45", "13", "B", "C", "D", "B", "A", ".5061; .5062; 41/81", "1512/5; 302.4", "C", "A", "B", "B", "D", "157.8; 789/5"],
    },
}


MODULE_META = {
    "rw1": ("Reading and Writing", 1, "Craft and Structure / Information and Ideas"),
    "rw2": ("Reading and Writing", 2, "Information and Ideas / Expression of Ideas"),
    "m1": ("Math", 1, "Advanced Math / Problem-Solving"),
    "m2": ("Math", 2, "Advanced Math / Geometry and Trigonometry"),
}


def find_question(pdf, test, section, number):
    candidates = []
    for page_index in PAGE_RANGES[test][section]:
        page = pdf.pages[page_index]
        for word in page.extract_words():
            x0 = float(word["x0"])
            top = float(word["top"])
            at_column_edge = x0 < 95 or 300 < x0 < 380
            in_question_header = any(
                float(rect["x1"]) - float(rect["x0"]) > 200
                and float(rect["top"]) - 4 <= top <= float(rect["bottom"]) + 4
                for rect in page.rects
            )
            if word["text"] == str(number) and at_column_edge and in_question_header and 72 < top < 735:
                candidates.append((page_index, word))
    if not candidates:
        raise RuntimeError(f"No match for test {test} {section} Q{number}")
    if len(candidates) > 1:
        raise RuntimeError(f"Ambiguous match for test {test} {section} Q{number}: {candidates}")
    return candidates[0]


def crop_bounds(page, start_word):
    start_x = float(start_word["x0"])
    start_top = float(start_word["top"])
    is_left = start_x < 200
    x0, x1 = (24, 306) if is_left else (306, 588)

    next_tops = []
    expected_rect_x = 36 if is_left else 315
    for rect in page.rects:
        width = float(rect["x1"]) - float(rect["x0"])
        top = float(rect["top"])
        if width > 200 and abs(float(rect["x0"]) - expected_rect_x) < 18 and top > start_top + 14:
            next_tops.append(top)

    bottom = min(next_tops) - 8 if next_tops else 724
    return (x0, max(68, start_top - 10), x1, min(736, bottom))


def answer_for(test, section, number):
    key = ANSWER_KEYS[test][section]
    return key[number - 1]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for existing in OUTPUT.glob("t*-*.png"):
        existing.unlink()
    records = []

    for test in (9, 10, 11):
        source = DESKTOP / f"sat-practice-test-{test}-digital.pdf"
        if not source.exists():
            raise FileNotFoundError(source)
        with pdfplumber.open(source) as pdf:
            for section, numbers in SELECTIONS[test].items():
                for number in numbers:
                    page_index, start_word = find_question(pdf, test, section, number)
                    page = pdf.pages[page_index]
                    bounds = crop_bounds(page, start_word)
                    filename = f"t{test}-{section}-q{number}.png"
                    page.crop(bounds).to_image(resolution=190, antialias=True).save(
                        OUTPUT / filename,
                        format="PNG",
                    )
                    subject, module, domain = MODULE_META[section]
                    records.append(
                        {
                            "id": f"t{test}-{section}-q{number}",
                            "test": test,
                            "section": section,
                            "subject": subject,
                            "module": module,
                            "domain": domain,
                            "originalNumber": number,
                            "sourcePage": page_index + 1,
                            "image": f"/questions/{filename}",
                            "answer": answer_for(test, section, number),
                            "difficulty": "Hard",
                        }
                    )

    (OUTPUT / "questions.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Extracted {len(records)} questions to {OUTPUT}")


if __name__ == "__main__":
    main()
