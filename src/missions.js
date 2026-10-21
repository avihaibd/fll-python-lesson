const HEADER = `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, ForceSensor
from pybricks.parameters import Port, Color, Direction
from pybricks.robotics import DriveBase
from pybricks.tools import wait, multitask, run_task

hub = PrimeHub()
left = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right = Motor(Port.D)
arm = Motor(Port.E)
robot = DriveBase(left, right, wheel_diameter=62.4, axle_track=120)
force = ForceSensor(Port.B)
color = ColorSensor(Port.C)
`;
const rr = (rnd, a, b) => Math.round((a + rnd() * (b - a)) / 10) * 10;
const MISSIONS = [
  { id: 1, tag: "היכרות", title: "מגרש משחקים",
    desc: "אין משימה, רק ניסויים. הריצו את הדוגמה, שנו מספרים ותראו מה קורה. מה קורה אם כותבים מספר שלילי? אם משנים את סדר השורות?",
    hint: "המרחק ב-robot.straight הוא במילימטרים (100 = 10 ס\"מ). הזווית ב-robot.turn היא במעלות: חיובי = ימינה, שלילי = שמאלה.",
    template: `print("שלום רובוט!")
robot.straight(500)   # נסיעה של 50 ס"מ קדימה
robot.turn(90)        # פנייה ימינה
robot.straight(300)
print("הגעתי!")
`,
    solution: `print("שלום רובוט!")
robot.straight(500)
robot.turn(90)
robot.straight(300)
robot.turn(-90)
robot.straight(400)
`,
    world: () => ({ size: [2000, 1200], start: [200, 600, 90], walls: [],
      zones: [{ x: 1500, y: 450, w: 250, h: 300, color: "GREEN" }, { x: 800, y: 150, w: 300, h: 250, color: "BLUE" },
              { x: 800, y: 800, w: 300, h: 250, color: "RED" }, { x: 1100, y: 500, w: 150, h: 200, color: "YELLOW" }],
      goal: { type: "none" } }) },
  { id: 2, tag: "נסיעה", title: "נסיעה לריבוע הירוק",
    desc: "הרובוט מתחיל משמאל ומסתכל ימינה. עצרו אותו כשהמרכז שלו בתוך הריבוע הירוק. אפשר למדוד את המרחק על המסך: המגרש רחב 2000 מ\"מ.",
    hint: "הרובוט מתחיל ב-x=150 ומרכז הירוק נמצא סביב x=1150. כמה מילימטרים ביניהם?",
    template: `# המטרה: לעצור בתוך הריבוע הירוק
robot.straight(100)   # שנו את המספר
`,
    solution: `robot.straight(1000)
`,
    world: () => { const g = { x: 1000, y: 480, w: 300, h: 240 };
      return { size: [2000, 1200], start: [150, 600, 90], walls: [],
        zones: [{ ...g, color: "GREEN" }, { x: 400, y: 100, w: 200, h: 200, color: "RED" }],
        goal: { type: "in_rect", rect: g } }; } },
  { id: 3, tag: "לולאות", title: "ריבוע על הרצפה",
    desc: "הרובוט צריך לנסוע בצורת ריבוע של 40 ס\"מ ולחזור בדיוק לנקודת ההתחלה, מסתכל לאותו כיוון. קודם כתבו את כל השורות, ואחר כך נסו לקצר אותן עם for.",
    hint: "ריבוע = נסיעה ופנייה של 90 מעלות, ארבע פעמים. בפייתון: for i in range(4): ואז שורות מוזחות.",
    template: `# ריבוע = נסיעה + פנייה, ארבע פעמים
robot.straight(400)
robot.turn(90)
`,
    solution: `for i in range(4):
    robot.straight(400)
    robot.turn(90)
`,
    world: () => ({ size: [2000, 1200], start: [600, 900, 0], walls: [],
      zones: [{ x: 540, y: 840, w: 120, h: 120, color: "WHITE", label: "התחלה" }], goal: { type: "square" } }) },
  { id: 4, tag: "חיישן מגע", title: "עצירה לפני הקיר",
    desc: "הקיר נמצא במרחק אחר בכל מגרש חדש! לכן אי אפשר לנחש מספר. נסעו עד שחיישן המגע נלחץ, עצרו, וחזרו אחורה 10 ס\"מ.",
    hint: "while not force.pressed(): ואז robot.drive(150, 0) בתוך הלולאה. אחרי הלולאה: robot.stop() ו-robot.straight(-100).",
    template: `# נסעו עד שהחיישן נוגע בקיר, אז עצרו וחזרו 10 ס"מ אחורה
while not force.pressed():
    robot.drive(150, 0)
`,
    solution: `while not force.pressed():
    robot.drive(150, 0)
robot.stop()
robot.straight(-100)
`,
    world: (rnd) => { const wx = rr(rnd, 1300, 1750);
      return { size: [2000, 1200], start: [150, 600, 90], walls: [{ x: wx, y: 250, w: 80, h: 700 }], zones: [],
        goal: { type: "wall_gap", wall_x: wx } }; } },
  { id: 5, tag: "חיישן צבע", title: "למצוא את הכחול",
    desc: "על הדרך יש פסים צהוב ואדום (מסיחים) ופס כחול שמיקומו משתנה. סעו ישר ועצרו כשחיישן הצבע רואה כחול.",
    hint: "while color.color() != Color.BLUE: ואז robot.drive(150, 0). אל תשכחו robot.stop() בסוף.",
    template: `# הרובוט נוסע 2 שניות ומדפיס את הצבע שהחיישן רואה
robot.drive(150, 0)
for i in range(10):
    print(color.color())
    wait(200)
robot.stop()
# המשימה: במקום 2 שניות קבועות, סעו עד שהצבע הוא כחול (while)
`,
    solution: `while color.color() != Color.BLUE:
    robot.drive(150, 0)
robot.stop()
`,
    world: (rnd) => { const bx = rr(rnd, 900, 1500);
      return { size: [2000, 1200], start: [150, 600, 90], walls: [],
        zones: [{ x: 400, y: 450, w: 100, h: 300, color: "YELLOW" }, { x: 650, y: 450, w: 100, h: 300, color: "RED" },
                { x: bx, y: 450, w: 120, h: 300, color: "BLUE" }], goal: { type: "color" } }; } },
  { id: 6, tag: "אתגר", title: "משימה מלאה וחזרה לבסיס",
    desc: "בסגנון FLL: צאו מהבית, סעו 70 ס\"מ קדימה, פנו ימינה, סעו עד הקיר (המרחק משתנה), ואז חזרו בדיוק לבית. רמז: robot.distance() אומר כמה נסעתם.",
    hint: "אחרי robot.reset() ו-d = robot.distance() אפשר לחזור עם robot.straight(-d). אחר כך robot.turn(-90) ו-robot.straight(-700).",
    template: `robot.straight(700)
robot.turn(90)
# המשיכו מכאן: נסיעה עד הקיר, ואז חזרה הביתה
`,
    solution: `robot.straight(700)
robot.turn(90)
robot.reset()
while not force.pressed():
    robot.drive(200, 0)
robot.stop()
d = robot.distance()
robot.straight(-d)
robot.turn(-90)
robot.straight(-700)
`,
    world: (rnd) => { const wx = rr(rnd, 1200, 1700); const base = { x: 60, y: 930, w: 180, h: 240 };
      return { size: [2000, 1200], start: [150, 1050, 0], walls: [{ x: wx, y: 150, w: 80, h: 400 }],
        zones: [{ ...base, color: "WHITE", label: "בית" }], goal: { type: "in_rect", rect: base, touch: 1 } }; } },
  { id: 7, tag: "async / await", title: "await: חכו שהפעולה תסתיים",
    desc: "בקוד של הקבוצה יש פונקציות async. בתוך async def כותבים await לפני פעולה, ופירושו: חכו שהיא תסתיים ואז תמשיכו. הרובוט צריך לנסוע 60 ס\"מ ולהרים את הזרוע 90 מעלות (המנוע בפורט E). הריבוע הירוק רחוק ב-600 מ\"מ, ולכן חסרה נסיעה נוספת.",
    hint: "הוסיפו עוד שורה await robot.straight(300). בסוף חייבים run_task(main()), אחרת הפונקציה לא רצה.",
    template: `async def main():
    await robot.straight(300)     # await: חכו שהנסיעה תסתיים
    await arm.run_angle(60, 90)   # הרימו את הזרוע 90 מעלות
    # הוסיפו נסיעה נוספת של 300 מ"מ כדי להגיע לירוק

run_task(main())
`,
    solution: `async def main():
    await robot.straight(300)
    await arm.run_angle(60, 90)
    await robot.straight(300)

run_task(main())
`,
    world: () => { const g = { x: 680, y: 480, w: 140, h: 240 };
      return { size: [2000, 1200], start: [150, 600, 90], walls: [], zones: [{ ...g, color: "GREEN" }],
        goal: { type: "multi", rect: g, tmax: 999999 } }; } },
  { id: 8, tag: "multitask", title: "multitask: שני דברים יחד",
    desc: "בקוד שלמעלה הרובוט קודם נוסע ואז מרים את הזרוע. באמת אפשר לעשות את שניהם בו-זמנית. מטרה: להגיע לירוק עם הזרוע למעלה בפחות מ-3.3 שניות. שימו לב לזמן בלוח המצב.",
    hint: "await multitask(drive_task(), arm_task()) מפעיל את שתי המשימות יחד וממשיך כששתיהן הסתיימו.",
    template: `async def drive_task():
    await robot.straight(600)

async def arm_task():
    await arm.run_angle(60, 90)

async def main():
    await drive_task()   # כרגע: קודם נוסעים, אחר כך מרימים. כמה זמן זה לוקח?
    await arm_task()

run_task(main())
`,
    solution: `async def drive_task():
    await robot.straight(600)

async def arm_task():
    await arm.run_angle(60, 90)

async def main():
    await multitask(drive_task(), arm_task())

run_task(main())
`,
    world: () => { const g = { x: 680, y: 480, w: 140, h: 240 };
      return { size: [2000, 1200], start: [150, 600, 90], walls: [], zones: [{ ...g, color: "GREEN" }],
        goal: { type: "multi", rect: g, tmax: 3300 } }; } },
  { id: 9, tag: "שגיאות", title: "הדפסה שנכשלת ואיך מתקנים",
    desc: "הריצו את הקוד ותקראו את השגיאה: היא אומרת באיזו שורה לחפש ומה לא מתאים. אי אפשר לחבר טקסט ומספר עם +. תקנו את ההדפסה בשתי דרכים, ואז תראו את הרובוט נוסע.",
    hint: "דרך 1: פסיק בין החלקים, print(\"מרחק:\", dist). דרך 2: f-string, print(f\"מרחק: {dist} mm\"). דרך נוספת: str(dist).",
    template: `dist = 300
print("מרחק: " + dist)    # הריצו וקראו את השגיאה
# תקנו את ההדפסה בשתי דרכים:
#   1. פסיק בין הטקסט למספר
#   2. f-string
robot.straight(dist)
`,
    solution: `dist = 300
print("מרחק:", dist)
print(f"מרחק: {dist} mm")
robot.straight(dist)
`,
    world: () => { const g = { x: 400, y: 480, w: 150, h: 240 };
      return { size: [2000, 1200], start: [150, 600, 90], walls: [], zones: [{ ...g, color: "GREEN" }],
        goal: { type: "in_rect", rect: g } }; } },
  { id: 10, tag: "משימת עונה", title: "משימת עונה: לצאת, לפתור, לחזור",
    desc: "מחצלת FLL בקנה מידה אמיתי (2362×1143 מ\"מ) עם המפה ממסמך הכללים. הרובוט יוצא משיגור שמאל ופונה למעלה. המטרה: משימה 02, \"זרעים מתפוצצים\" (הדגם הירוק). צריך להגיע אליו, לגעת בו עם חיישן המגע ולהפעיל אותו עם הלבשת הזרוע (מנוע E) שמשחררת את הזרעים, ואז לחזור לשיגור שמאל. הדגמים האדומים (01, 03, 11 ו-10) הם מכשולים: כל מגע בהם נחשב כישלון. המיקומים והמידות של הדגמים מוערכים לפי התרשים במסמך.",
    hint: "עולים בערך 380 מ\"מ עד גובה דגם 02, פונים ימינה ונוסעים עד שחיישן המגע נלחץ. אחרי ההפעלה חוזרים אחורה בדיוק את המרחק שנסעתם (robot.distance()), פונים ויורדים 380 מ\"מ. פנייה שמאלה במקום ימינה תפגע בדגם 03.",
    template: `# יוצאים משיגור שמאל, הרובוט מסתכל למעלה
robot.straight(380)    # עולים עד גובה דגם 02
robot.turn(90)         # פונים ימינה, אל הדגם הירוק
# המשיכו: סעו עד שחיישן המגע נלחץ, הפעילו את ההלבשה (הזרוע) וחזרו לשיגור
`,
    solution: `robot.straight(380)
robot.turn(90)
robot.reset()
while not force.pressed():
    robot.drive(200, 0)
robot.stop()
arm.run_angle(90, 90)       # משחררים את הזרעים
d = robot.distance()
robot.straight(-d)          # חזרה אחורה
robot.turn(90)
robot.straight(380)         # חזרה לשיגור
`,
    world: () => { const home = { x: 60, y: 880, w: 420, h: 200 };
      return { size: [2362, 1143], start: [270, 980, 0],
        walls: [
          { x: 700, y: 540, w: 200, h: 130, label: "02", target: 1 },
          { x: 20, y: 300, w: 180, h: 180, label: "03", avoid: 1 },
          { x: 940, y: 960, w: 200, h: 180, label: "01", avoid: 1 },
          { x: 1180, y: 300, w: 220, h: 150, label: "10", avoid: 1 },
          { x: 1560, y: 470, w: 200, h: 140, label: "11", avoid: 1 }],
        zones: [{ ...home, color: "WHITE", label: "שיגור שמאל" }, { x: 1880, y: 880, w: 420, h: 200, color: "WHITE", label: "שיגור ימין" }],
        goal: { type: "season", rect: home, tmax: 60000 } }; } },
];
if (typeof module !== "undefined") module.exports = { HEADER, MISSIONS };
