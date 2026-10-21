import math

class _Color:
    def __init__(self, n):
        self.n = n
    def __repr__(self):
        return "Color." + self.n
    def __str__(self):
        return "Color." + self.n
    def __eq__(self, o):
        return isinstance(o, _Color) and o.n == self.n
    def __ne__(self, o):
        return not (isinstance(o, _Color) and o.n == self.n)

class Color:
    RED = _Color("RED")
    GREEN = _Color("GREEN")
    BLUE = _Color("BLUE")
    YELLOW = _Color("YELLOW")
    WHITE = _Color("WHITE")
    BLACK = _Color("BLACK")
    NONE = _Color("NONE")

class Port:
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"

class Direction:
    CLOCKWISE = 1
    COUNTERCLOCKWISE = -1

LEN = 160.0
WID = 120.0
DT = 20
MAX_T = 90000

class Sim:
    def start(self, world):
        self.wd = world
        self.x = float(world["start"][0])
        self.y = float(world["start"][1])
        self.h = float(world["start"][2])
        self.h0 = self.h
        self.t = 0
        self.v = 0.0
        self.om = 0.0
        self.ss = 200.0
        self.tr = 100.0
        self.signed = 0.0
        self.path = 0.0
        self.frames = []
        self.ev = []
        self.arm = 0.0
        self.aw = 0.0
        self.defer = False
        self.solved = False
        self.touched = False
        self.bad = ""
        self.hw = None
        self.frame()
    def hit(self, px, py):
        self.hw = None
        if px < 0 or py < 0 or px > self.wd["size"][0] or py > self.wd["size"][1]:
            return True
        for r in self.wd["walls"]:
            if r["x"] <= px and px <= r["x"] + r["w"] and r["y"] <= py and py <= r["y"] + r["h"]:
                self.hw = r
                return True
        return False
    def blocked(self, x, y, h):
        a = math.radians(h)
        fx = math.sin(a)
        fy = -math.cos(a)
        rx = math.cos(a)
        ry = math.sin(a)
        for l in (-LEN / 2, 0, LEN / 2):
            for s in (-WID / 2, 0, WID / 2):
                if self.hit(x + fx * l + rx * s, y + fy * l + ry * s):
                    return True
        return False
    def pressed(self):
        a = math.radians(self.h)
        return self.hit(self.x + math.sin(a) * (LEN / 2 + 4), self.y - math.cos(a) * (LEN / 2 + 4))
    def color(self):
        for z in self.wd["zones"]:
            if z["x"] <= self.x and self.x <= z["x"] + z["w"] and z["y"] <= self.y and self.y <= z["y"] + z["h"]:
                return getattr(Color, z["color"])
        return Color.WHITE
    def frame(self):
        p = self.pressed()
        if p:
            self.touched = True
            if self.hw is not None and self.hw.get("avoid"):
                self.bad = self.bad or self.hw.get("label", "דגם")
            elif self.arm >= 85:
                self.solved = True
        self.frames.append("%.0f,%.1f,%.1f,%.1f,%d,%.0f" % (self.t, self.x, self.y, self.h, 1 if p else 0, self.arm))
    def step(self, v, om, ms, aw=None):
        if aw is None:
            aw = self.aw
        if self.t >= MAX_T:
            raise RuntimeError("הריצה ארוכה מדי (יותר מ-90 שניות). בדקו שהלולאה שלכם נגמרת")
        nh = self.h + om * ms / 1000.0
        hm = math.radians((self.h + nh) / 2.0)
        d = v * ms / 1000.0
        nx = self.x + math.sin(hm) * d
        ny = self.y - math.cos(hm) * d
        ok = not self.blocked(nx, ny, nh)
        if not ok and self.hw is not None and self.hw.get("avoid"):
            self.bad = self.bad or self.hw.get("label", "דגם")
        if ok:
            self.x = nx
            self.y = ny
            self.h = nh
            self.signed += d
            self.path += abs(d)
        self.arm += aw * ms / 1000.0
        self.t += ms
        self.frame()
        return ok
    def run(self, v, om, ms):
        while ms > 0:
            s = min(DT, ms)
            self.step(v, om, s)
            ms -= s

S = Sim()

def start(world):
    S.start(world)

def L(n):
    if len(S.ev) < 30000:
        S.ev.append("%d:%d" % (len(S.frames) - 1, n))

class DriveBase:
    def __init__(self, left_motor, right_motor, wheel_diameter, axle_track):
        pass
    def settings(self, straight_speed=None, straight_acceleration=None, turn_rate=None, turn_acceleration=None):
        if straight_speed:
            S.ss = float(straight_speed)
        if turn_rate:
            S.tr = float(turn_rate)
    def straight(self, distance, then=None, wait=True):
        if S.defer:
            return Op("straight", distance, S.ss)
        left = abs(distance)
        sg = 1 if distance >= 0 else -1
        S.v = 0.0
        S.om = 0.0
        while left > 0.01:
            ms = max(1, min(DT, left / S.ss * 1000.0))
            x0 = S.signed
            if not S.step(sg * S.ss, 0, ms):
                break
            left -= abs(S.signed - x0)
    def turn(self, angle, then=None, wait=True):
        if S.defer:
            return Op("turn", angle, S.tr)
        left = abs(angle)
        sg = 1 if angle >= 0 else -1
        S.v = 0.0
        S.om = 0.0
        while left > 0.01:
            ms = max(1, min(DT, left / S.tr * 1000.0))
            h0 = S.h
            if not S.step(0, sg * S.tr, ms):
                break
            left -= abs(S.h - h0)
    def curve(self, radius, angle, then=None, wait=True):
        if S.defer:
            o = Op("curve", angle, S.ss)
            o.om = (1 if angle >= 0 else -1) * math.degrees(S.ss / abs(radius))
            return o
        left = abs(angle)
        sg = 1 if angle >= 0 else -1
        om = sg * math.degrees(S.ss / abs(radius))
        S.v = 0.0
        S.om = 0.0
        while left > 0.01:
            ms = max(1, min(DT, left / abs(om) * 1000.0))
            h0 = S.h
            if not S.step(S.ss, om, ms):
                break
            left -= abs(S.h - h0)
    def drive(self, speed, turn_rate):
        S.v = float(speed)
        S.om = float(turn_rate)
    def stop(self):
        S.v = 0.0
        S.om = 0.0
    def distance(self):
        return S.signed
    def angle(self):
        return S.h - S.h0
    def reset(self):
        S.signed = 0.0
        S.h0 = S.h

class Motor:
    def __init__(self, port, positive_direction=1):
        self.port = port
        self.isarm = (port == "E")
    def _op(self, amount, speed):
        sp = abs(float(speed))
        if sp < 1:
            sp = 1.0
        if self.isarm:
            o = Op("arm", amount, sp)
            if speed < 0:
                o.sg = -o.sg
            return o
        return Op("wait", abs(amount) / sp * 1000.0, 0)
    def run_angle(self, speed, rotation_angle, then=None, wait=True):
        o = self._op(rotation_angle, speed)
        if S.defer:
            return o
        block(o)
    def run_target(self, speed, target_angle, then=None, wait=True):
        o = self._op(target_angle - S.arm if self.isarm else 0, speed)
        if S.defer:
            return o
        block(o)
    def run(self, speed):
        if self.isarm:
            S.aw = float(speed)
    def stop(self):
        if self.isarm:
            S.aw = 0.0
    def angle(self):
        return S.arm if self.isarm else 0

class ForceSensor:
    def __init__(self, port):
        pass
    def pressed(self, force=3):
        S.run(S.v, S.om, 10)
        return S.pressed()

class ColorSensor:
    def __init__(self, port):
        pass
    def color(self, surface=True):
        S.run(S.v, S.om, 10)
        return S.color()

class _Disp:
    def text(self, t):
        print("[מסך] " + str(t))

class _Spk:
    def beep(self, frequency=500, duration=100):
        print("[ביפ]")

class PrimeHub:
    def __init__(self):
        self.display = _Disp()
        self.speaker = _Spk()

def wait(ms):
    if S.defer:
        return Op("wait", ms, 0)
    S.run(S.v, S.om, int(ms))

class Op:
    def __init__(self, kind, amount, speed):
        self.kind = kind
        self.left = abs(float(amount))
        self.sg = 1 if amount >= 0 else -1
        self.speed = float(speed)
        self.om = 0.0
    def ttf(self):
        if self.kind == "wait":
            return self.left
        if self.kind == "curve":
            return self.left / max(abs(self.om), 0.001) * 1000.0
        return self.left / max(self.speed, 0.001) * 1000.0

class A:
    def __init__(self, fn, *args, **kw):
        self.fn = fn
        self.args = args
        self.kw = kw

class Group:
    def __init__(self, tasks, race):
        self.tasks = tasks
        self.race = race

class Task:
    def __init__(self, gen):
        self.gen = gen
        self.wait = None
        self.done = False

def multitask(*gens, **kw):
    return Group([Task(g) for g in gens], bool(kw.get("race", False)))

def tick(ops):
    ms = float(DT)
    for o in ops:
        ms = min(ms, max(1.0, o.ttf()))
    v = None
    om = None
    aw = None
    chassis = None
    for o in ops:
        if o.kind == "straight" and chassis is None:
            chassis = o
            v = o.sg * o.speed
            om = 0.0
        elif o.kind == "turn" and chassis is None:
            chassis = o
            v = 0.0
            om = o.sg * o.speed
        elif o.kind == "curve" and chassis is None:
            chassis = o
            v = S.ss
            om = o.om
        elif o.kind == "arm":
            aw = o.sg * o.speed
    if chassis is None:
        v = S.v
        om = S.om
    x0 = S.signed
    h0 = S.h
    a0 = S.arm
    ok = S.step(v, om, ms, aw)
    for o in ops:
        if o.kind == "wait":
            o.left -= ms
        elif o.kind == "arm":
            o.left -= abs(S.arm - a0)
        elif o is chassis:
            if o.kind == "straight":
                o.left -= abs(S.signed - x0)
            else:
                o.left -= abs(S.h - h0)
            if not ok:
                o.left = 0.0

def block(op):
    while op.left > 0.001:
        tick([op])

def collect(task, ops):
    if task.done:
        return
    w = task.wait
    if isinstance(w, Op):
        ops.append(w)
    elif isinstance(w, Group):
        for c in w.tasks:
            collect(c, ops)

def resume(task):
    try:
        req = next(task.gen)
    except StopIteration:
        task.done = True
        return
    if not isinstance(req, A):
        return
    S.defer = True
    try:
        res = req.fn(*req.args, **req.kw)
    finally:
        S.defer = False
    if isinstance(res, Op) or isinstance(res, Group):
        task.wait = res
    elif res is not None:
        task.wait = Group([Task(res)], False)

def advance(task):
    if task.done:
        return False
    w = task.wait
    if w is None:
        resume(task)
        return True
    if isinstance(w, Op):
        if w.left <= 0.001:
            task.wait = None
            return True
        return False
    prog = False
    for c in w.tasks:
        if advance(c):
            prog = True
    fin = 0
    for c in w.tasks:
        if c.done:
            fin += 1
    if (w.race and fin > 0) or fin == len(w.tasks):
        for c in w.tasks:
            c.done = True
        task.wait = None
        return True
    return prog

def run_task(main):
    root = Task(main)
    n = 0
    while True:
        while advance(root):
            n += 1
            if n > 200000:
                raise RuntimeError("יותר מדי פעולות במשימה")
        if root.done:
            break
        ops = []
        collect(root, ops)
        if not ops:
            raise RuntimeError("המשימה ממתינה ולא קורה כלום. בדקו שכל await מופעל על פעולה")
        tick(ops)

def check():
    g = S.wd["goal"]
    t = g["type"]
    ok = False
    msg = ""
    if t == "none":
        msg = ""
    elif t == "in_rect":
        r = g["rect"]
        inside = r["x"] <= S.x and S.x <= r["x"] + r["w"] and r["y"] <= S.y and S.y <= r["y"] + r["h"]
        ok = inside and (S.touched or not g.get("touch"))
        if not inside:
            msg = "הרובוט לא נעצר בתוך היעד. בדקו מרחקים וזוויות."
        elif not ok:
            msg = "הרובוט הגיע ליעד, אבל צריך גם לגעת בקיר בדרך."
    elif t == "square":
        dx = S.x - S.wd["start"][0]
        dy = S.y - S.wd["start"][1]
        dh = (S.h - S.wd["start"][2]) % 360
        if dh > 180:
            dh -= 360
        ok = (dx * dx + dy * dy) ** 0.5 < 60 and abs(dh) < 10 and S.path > 1400
        if not ok:
            msg = "הרובוט צריך לחזור לנקודת ההתחלה ולהסתכל לאותו כיוון, אחרי ריבוע שלם."
    elif t == "wall_gap":
        gap = g["wall_x"] - (S.x + LEN / 2)
        ok = S.touched and 70 <= gap and gap <= 130
        if not S.touched:
            msg = "הרובוט לא נגע בקיר. השתמשו בחיישן המגע."
        elif not ok:
            msg = "אחרי המגע צריך לחזור אחורה בערך 10 ס\"מ. כרגע המרחק מהקיר הוא %d מ\"מ." % int(gap)
    elif t == "multi":
        r = g["rect"]
        inside = r["x"] <= S.x and S.x <= r["x"] + r["w"] and r["y"] <= S.y and S.y <= r["y"] + r["h"]
        ok = inside and S.arm >= 85 and S.t <= g["tmax"]
        if not inside:
            msg = "הרובוט לא עצר בתוך הריבוע הירוק."
        elif S.arm < 85:
            msg = "הזרוע לא הורמה מספיק (צריך 90 מעלות). עכשיו: %d." % int(S.arm)
        elif not ok:
            msg = "הכול הצליח, אבל זה לקח %.1f שניות. אם הנסיעה וההרמה קורות יחד זה אמור להיות פחות מ-%.1f." % (S.t / 1000.0, g["tmax"] / 1000.0)
    elif t == "season":
        r = g["rect"]
        inside = r["x"] <= S.x and S.x <= r["x"] + r["w"] and r["y"] <= S.y and S.y <= r["y"] + r["h"]
        ok = S.solved and inside and S.t <= g["tmax"] and not S.bad
        if S.bad:
            msg = "הרובוט פגע בדגם אחר (%s). צריך להגיע לדגם היעד ולחזור בלי לגעת באחרים." % S.bad
        elif not S.touched:
            msg = "הרובוט לא נגע בדגם. נסעו עד שחיישן המגע נלחץ."
        elif not S.solved:
            msg = "הרובוט נגע בדגם אבל לא הפעיל אותו: צריך להרים את הזרוע 90 מעלות בזמן המגע."
        elif not inside:
            msg = "הדגם הופעל, אבל הרובוט לא חזר לשיגור שמאל."
        elif not ok:
            msg = "הצלחתם, אבל לקח %.0f שניות. היעד: פחות מ-%.0f." % (S.t / 1000.0, g["tmax"] / 1000.0)
    elif t == "color":
        ok = S.color() == Color.BLUE
        if not ok:
            msg = "הרובוט צריך לעצור כשהחיישן על הכחול."
    return "1" if ok else "0", msg

def out():
    ok, msg = check()
    f = S.color().n
    print("@@RES|%s|%s|%.1f|%.1f|%.1f|%d|%s|%.0f|%s|%s" % (ok, msg, S.x, S.y, S.h, 1 if S.pressed() else 0, f, S.t, ";".join(S.ev), ";".join(S.frames)))
