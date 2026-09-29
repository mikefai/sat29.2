# SAT Peak Practice

A four-module, 108-question SAT challenge exam built from difficult questions selected from the user-supplied official Practice Tests 9, 10, and 11.

## Included

- 54 Reading and Writing questions and 54 Math questions
- Exactly 27 questions in each of the four modules
- Four modules with timed and untimed modes
- Exact PDF question excerpts, including mathematical notation and figures
- Multiple-choice and student-produced response controls
- Question navigator, review flags, pause, directions, and Math reference sheet
- Local autosave and resume
- Post-exam raw results, practice-only projection, and 108-question answer review
- Responsive desktop and mobile layouts

## Run locally

```powershell
npm install
npm run dev
```

Production checks:

```powershell
npm run validate:content
npm run lint
npm run build
```

## Question extraction

The generated question assets live in `public/questions`. To regenerate them, place the three source PDFs on the OneDrive Desktop using their original filenames and run:

```powershell
python scripts/extract_questions.py
```

The selection takes nine questions from each source test in every module. Reading and Writing items come from the difficult end of their skill groups; Math items emphasize questions 19–27, the final and generally highest-difficulty portion of each module.

## Scoring note

This is a concentrated hardest-question set, not a standard adaptive SAT form. The results page therefore labels its 400–1600 projection as unofficial and practice-only. Raw section results are the reliable measure inside this app.

SAT is a registered trademark of College Board. This independent practice interface is not endorsed by College Board.
