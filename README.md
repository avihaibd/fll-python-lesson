# פייתון לרובוט: שיעור הכרות ל-FLL

דף יחיד (`index.html`) עם מערך שיעור, מצגת, סימולטור עם דיבאג, תכנון ריצה על המפה ומושגי יסוד.
הפייתון רץ בדפדפן (Skulpt, נטען מ-jsDelivr), ולכן צריך חיבור לאינטרנט בכניסה לדף.

## הפעלה ב-GitHub Pages
Settings → Pages → Deploy from branch → `main` / root.

## קרדיט
תמונת המפה והתרשימים מבוססים על FIRST LEGO League Challenge, ספר החוקים של עונת BIOGLOW:
https://firstinspires.blob.core.windows.net/fll/challenge/2026-27/fll-challenge-bioglow-rgr.pdf
זכויות התמונה שייכות ל-FIRST ול-LEGO. מיקומי הדגמים בדף מוערכים.

## מבנה הקוד

העריכה נעשית בתיקיית `src/`, ו-`index.html` נבנה ממנה:

- `src/page.html` – מבנה הדף (HTML)
- `src/style.css` – עיצוב
- `src/app.js` – לוגיקת הממשק, החידון, המתכנן
- `src/missions.js` – המשימות 1–10
- `src/simcore.py` – מנוע הסימולטור (פייתון, רץ ב-Skulpt)
- `src/seasonmap.jpg` – מפת העונה

לבנייה מחדש: `python3 src/build.py` (יוצר את `index.html` בתיקיית השורש). יש לעשות commit גם ל-`index.html`, כי GitHub Pages מגיש אותו.
