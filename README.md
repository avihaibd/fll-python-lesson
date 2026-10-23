# פייתון לרובוט: שיעור הכרות ל-FLL

[לאתר](https://avihaibd.github.io/fll-python-lesson/) · [מצב תרגול לתלמידים](https://avihaibd.github.io/fll-python-lesson/?s=q7x2) · [הורדת המצגת (PowerPoint)](python-for-robot.pptx)

דף יחיד (`index.html`) עם מערך שיעור, מצגת, סימולטור עם דיבאג, תכנון ריצה על המפה ומושגי יסוד.
הפייתון רץ בדפדפן (Skulpt, נטען מ-jsDelivr), ולכן צריך חיבור לאינטרנט בכניסה לדף.

## הפעלה ב-GitHub Pages
Settings → Pages → Deploy from branch → `main` / root.

## קרדיט
תמונת המפה והתרשימים מבוססים על FIRST LEGO League Challenge, ספר החוקים של עונת BIOGLOW:
https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf
זכויות התמונה שייכות ל-FIRST ול-LEGO. מיקומי הדגמים בדף מוערכים.

## מבנה הקוד

`index.html` הוא קובץ המקור, והוא טוען ישירות את הקבצים מ-`src/`. אין שלב בנייה, ועורכים ישירות:

- `index.html` – מבנה הדף (HTML)
- `src/style.css` – עיצוב
- `src/app.js` – לוגיקת הממשק, החידון, המתכנן
- `src/missions.js` – המשימות 1–10
- `src/simcore.py` – מנוע הסימולטור (פייתון, רץ ב-Skulpt)
- `src/maps.js` – רשימת המפות (והמפה הנוכחית)
- `src/maps/` – תמונות המפות. להוספת מפה: מוסיפים תמונה לכאן ושורה ב-`maps.js`

לבדיקה מקומית צריך שרת (הדף טוען קבצים עם `fetch`, ולכן פתיחה ישירה של הקובץ לא תעבוד): `python3 -m http.server` ואז http://localhost:8000.

אופציונלי: `python3 src/build.py` יוצר `bundle.html`, קובץ יחיד עצמאי שאפשר לשלוח או לפתוח ישירות.
