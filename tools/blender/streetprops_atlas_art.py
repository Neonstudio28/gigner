"""Original artwork for the streetprops atlas: every region is painted here (see streetprops_atlas.Painter)."""
import math

W, K_, R, Y, GN, BL, OR = '#f1efe8', '#18181a', '#b8281f', '#f2c12e', '#1f6a45', '#234f9e', '#e8742a'
PAPER, CARD = '#e6e1d3', '#b98f5e'


def _page(p, w, h, title, accent):
    """Newspaper front page: masthead, headline bars, photo block and text columns."""
    p.text(title, w / 2, 11, 11, K_, bold=0.02, maxw=w - 10)
    p.rect(5, 20, w - 10, 2, K_)
    p.rect(5, 26, w - 10, 7, '#2b2b2e')
    p.rect(5, 36, w * 0.55, 5, '#2b2b2e')
    p.rect(5, 46, w * 0.5, h * 0.3, accent)
    for i in range(int((h - 50) / 5)):
        p.rect(w * 0.5 + 10, 46 + i * 5, w * 0.5 - 15, 2, '#8a877f')
    for i in range(int((h - 54 - h * 0.3) / 5)):
        p.rect(5, 52 + h * 0.3 + i * 5, w * 0.5, 2, '#8a877f')


def paint(p):
    # ------------------------------------------------------------ road signs
    w, h = p.region('stop', 128, 128, R)
    o = [(w * u, h * v) for u, v in ((.293, 0), (.707, 0), (1, .293), (1, .707), (.707, 1), (.293, 1), (0, .707), (0, .293))]
    p.poly([(64 + (x - 64) * .93, 64 + (y - 64) * .93) for x, y in o], W)
    p.poly([(64 + (x - 64) * .85, 64 + (y - 64) * .85) for x, y in o], R)
    p.text('STOP', 64, 64, 34, W, bold=0.03, maxw=92)

    w, h = p.region('yield', 128, 112, R)
    p.poly([(26, 16), (102, 16), (64, 84)], W)
    p.text('YIELD', 64, 30, 11, R, bold=0.03)

    w, h = p.region('one_way', 192, 64, K_)
    p.frame(2, 2, w - 4, h - 4, 3, W, K_, 5)
    p.poly([(14, 22), (136, 22), (136, 10), (180, 32), (136, 54), (136, 42), (14, 42)], W)
    p.text('ONE WAY', 76, 32, 13, K_, bold=0.03)

    w, h = p.region('speed', 96, 128, W)
    p.frame(3, 3, w - 6, h - 6, 3, K_, W, 6)
    p.text('SPEED', 48, 22, 13, K_, bold=0.03)
    p.text('LIMIT', 48, 42, 13, K_, bold=0.03)
    p.text('25', 48, 88, 48, K_, bold=0.03)

    for name in ('ped', 'dead_end'):
        w, h = p.region(name, 128, 128, Y)
        d = [(64, 5), (123, 64), (64, 123), (5, 64)]
        p.poly(d, K_)
        p.poly([(64 + (x - 64) * .93, 64 + (y - 64) * .93) for x, y in d], Y)
        if name == 'ped':
            p.circle(66, 34, 8, K_)
            p.line((65, 48), (62, 76), 11, K_)
            p.line((62, 76), (50, 100), 8, K_)
            p.line((62, 76), (74, 86), 8, K_)
            p.line((74, 86), (78, 100), 8, K_)
            p.line((66, 50), (50, 64), 6, K_)
            p.line((66, 50), (80, 62), 6, K_)
        else:
            p.text('DEAD', 64, 52, 19, K_, bold=0.03)
            p.text('END', 64, 78, 19, K_, bold=0.03)

    w, h = p.region('no_parking', 96, 128, W)
    p.frame(3, 3, w - 6, h - 6, 3, R, W, 6)
    p.text('P', 48, 44, 40, K_, bold=0.04)
    p.circle(48, 44, 31, R)
    p.circle(48, 44, 25, W)
    p.text('P', 48, 44, 32, K_, bold=0.04)
    p.line((28, 24), (68, 64), 6, R)
    p.text('NO PARKING', 48, 90, 9, R, bold=0.03, maxw=78)
    p.text('ANY TIME', 48, 108, 9, R, bold=0.03)

    w, h = p.region('chevron', 96, 128, Y)
    p.frame(3, 3, w - 6, h - 6, 3, K_, Y, 5)
    p.poly([(60, 16), (82, 16), (46, 64), (82, 112), (60, 112), (22, 64)], K_)

    w, h = p.region('route', 128, 128, K_)
    sh = [(18, 22), (40, 14), (64, 22), (88, 14), (110, 22), (114, 60), (104, 90), (64, 116), (24, 90), (14, 60)]
    p.poly(sh, W)
    p.text('STATE', 64, 36, 9, K_, bold=0.03)
    p.text('9', 64, 72, 44, K_, bold=0.04)

    for name, label in (('street_a', 'LAKE ST'), ('street_b', 'PINE AVE')):
        w, h = p.region(name, 224, 44, GN)
        p.frame(2, 2, w - 4, h - 4, 2, W, GN, 4)
        p.text(label, w / 2, h / 2, 21, W, bold=0.025)

    w, h = p.region('highway', 384, 176, GN)
    p.frame(4, 4, w - 8, h - 8, 4, W, GN, 12)
    p.text('Mill Creek', 28, 52, 30, W, 'l', 0.02)
    p.text('4', w - 30, 52, 30, W, 'r', 0.02)
    p.text('Coldwater', 28, 120, 30, W, 'l', 0.02)
    p.text('17', w - 30, 120, 30, W, 'r', 0.02)
    p.rect(24, 84, w - 48, 3, W)

    w, h = p.region('for_sale', 192, 128, W)
    p.frame(0, 0, w, h, 3, R, W)
    p.rect(3, 3, w - 6, 49, R)
    p.text('FOR SALE', w / 2, 27, 26, W, bold=0.03, maxw=170)
    p.text('HOLLOW REALTY', w / 2, 72, 13, BL, bold=0.025, maxw=170)
    p.text('555-0142', w / 2, 102, 20, K_, bold=0.03)

    w, h = p.region('aframe', 128, 192, '#2d3b33')
    p.frame(5, 5, w - 10, h - 10, 2, '#d9d4c2', '#2d3b33', 4)
    p.text('OPEN', 64, 36, 30, Y, bold=0.03)
    p.rect(22, 60, 84, 3, '#d9d4c2')
    p.text('HOT COFFEE', 64, 84, 13, W, bold=0.02, maxw=104)
    p.text('FRESH PIE', 64, 110, 13, W, bold=0.02)
    p.text('BAIT + ICE', 64, 136, 13, '#ee8f7c', bold=0.02)
    p.arrow((40, 166), (92, 166), 7, Y)

    w, h = p.region('bus', 96, 128, BL)
    p.frame(3, 3, w - 6, h - 6, 3, W, BL, 6)
    p.rect(22, 22, 52, 50, W, 7)
    p.rect(27, 28, 42, 18, BL, 2)
    p.rect(27, 52, 9, 6, BL)
    p.rect(60, 52, 9, 6, BL)
    p.rect(26, 72, 10, 8, W, 2)
    p.rect(60, 72, 10, 8, W, 2)
    p.text('BUS', 48, 102, 19, W, bold=0.03)

    w, h = p.region('barricade', 192, 32, W)
    for i in range(-2, 12):
        p.poly([(i * 32, 0), (i * 32 + 16, 0), (i * 32 + 48, 32), (i * 32 + 32, 32)], OR)

    # ------------------------------------------------------------ machines
    w, h = p.region('soda', 160, 352, '#c5262b')
    p.poly([(0, 150), (60, 120), (110, 170), (160, 140), (160, 210), (110, 240), (60, 190), (0, 220)], W)
    for cx, cy, r in ((30, 60, 9), (120, 40, 6), (135, 95, 11), (24, 260, 7), (60, 300, 12), (128, 280, 8), (98, 80, 4), (40, 110, 5)):
        p.circle(cx, cy, r, '#dc4a44')
    p.text('FIZZ', 80, 64, 44, W, bold=0.04, maxw=140, rot=-8)
    p.text('COLA', 80, 181, 26, '#c5262b', bold=0.04, rot=-8)
    p.rect(0, 318, w, 34, '#8f1820')
    p.text('ICE COLD', 80, 335, 14, W, bold=0.03)

    w, h = p.region('snack_head', 192, 40, '#4a2f22')
    p.text('SNACKS', 96, 20, 20, Y, bold=0.03)
    p.circle(22, 20, 8, OR)
    p.circle(170, 20, 8, OR)

    w, h = p.region('ice', 256, 88, '#dfeaf2')
    p.text('ICE', 128, 46, 52, '#2a62b3', bold=0.05)
    for cx in (28, 228):
        for a in range(0, 180, 60):
            dx, dy = 14 * math.cos(math.radians(a)), 14 * math.sin(math.radians(a))
            p.line((cx - dx, 44 - dy), (cx + dx, 44 + dy), 3, '#2a62b3')
    w, h = p.region('ice_door', 80, 96, '#2a62b3')
    p.frame(3, 3, w - 6, h - 6, 2, W, '#2a62b3', 4)
    p.text('ICE', 40, 30, 22, W, bold=0.04)
    p.text('CUBED', 40, 58, 9, '#bfe0f5', bold=0.03)
    p.text('BLOCK', 40, 76, 9, '#bfe0f5', bold=0.03)

    for name, title, acc in (('news_a', 'COURIER', '#77808a'), ('news_b', 'GAZETTE', '#8a7d6c'), ('news_c', 'SHOPPER', '#b3554a')):
        w, h = p.region(name, 96, 128, PAPER)
        _page(p, w, h, title, acc)
    for name, label, bg, fg in (('tag_news', 'NEWS', W, K_), ('tag_daily', 'DAILY', K_, W), ('tag_take', 'TAKE ONE', Y, K_)):
        w, h = p.region(name, 96, 28, bg)
        p.text(label, 48, 14, 14, fg, bold=0.03, maxw=84)

    w, h = p.region('phone_sign', 96, 96, BL)
    p.frame(3, 3, w - 6, h - 6, 2, W, BL, 6)
    p.lines([(30, 34), (34, 22), (62, 22), (66, 34)], 9, W)
    p.rect(24, 30, 14, 12, W, 3)
    p.rect(58, 30, 14, 12, W, 3)
    p.rect(34, 44, 28, 20, W, 4)
    p.circle(48, 54, 6, BL)
    p.text('PHONE', 48, 78, 11, W, bold=0.03)
    w, h = p.region('phone_card', 48, 64, W)
    p.rect(0, 0, w, 14, R)
    for i in range(8):
        p.rect(5, 20 + i * 5, 38 if i % 3 else 26, 2, '#55585c')
    w, h = p.region('phone_head', 192, 36, BL)
    p.text('TELEPHONE', 96, 18, 17, W, bold=0.03)

    w, h = p.region('atm_screen', 128, 96, '#0f2b2a')
    p.text('WELCOME', 64, 22, 12, '#63e08a', bold=0.02)
    p.text('INSERT CARD', 64, 46, 9, '#63e08a', bold=0.02)
    p.rect(20, 62, 88, 2, '#2c8a52')
    p.rect(20, 72, 54, 2, '#2c8a52')
    p.rect(20, 82, 70, 2, '#2c8a52')
    w, h = p.region('atm_head', 192, 44, '#156a6e')
    p.text('24 HR CASH', 96, 22, 20, W, bold=0.03)
    w, h = p.region('keypad', 64, 64, '#3a3d42')
    for r_ in range(4):
        for c in range(3):
            col = ('#c9cdd0' if r_ < 3 else ('#c0392b', '#c9cdd0', '#3a9d4f')[c])
            p.rect(6 + c * 19, 5 + r_ * 15, 14, 10, col, 2)

    w, h = p.region('donate', 192, 176, W)
    p.frame(0, 0, w, h, 5, GN, W)
    p.circle(80, 46, 17, R)
    p.circle(112, 46, 17, R)
    p.poly([(64, 54), (128, 54), (96, 90)], R)
    p.text('DONATE', 96, 116, 24, GN, bold=0.035)
    p.text('CLOTHING DROP', 96, 150, 12, K_, bold=0.03, maxw=170)

    w, h = p.region('pump_face', 176, 200, '#e9e4d2')
    p.frame(4, 4, w - 8, h - 8, 3, '#8c8a80', '#e9e4d2', 6)
    for i, (label, val) in enumerate((('TOTAL SALE $', '08.45'), ('GALLONS', '07.2'), ('PRICE PER GALLON', '1.17'))):
        y = 16 + i * 60
        p.text(label, 88, y + 6, 8, '#3a3a3c', bold=0.025)
        p.rect(28, y + 15, 120, 32, K_, 3)
        p.text(val, 88, y + 31, 20, W, bold=0.03)
    w, h = p.region('pump_grade', 176, 52, W)
    p.rect(0, 0, w, 9, R)
    p.rect(0, h - 9, w, 9, R)
    p.text('REGULAR', 88, 26, 20, R, bold=0.035)
    w, h = p.region('air', 96, 96, BL)
    p.circle(48, 34, 22, W)
    p.circle(48, 34, 13, BL)
    p.circle(48, 34, 5, W)
    p.text('AIR', 48, 76, 20, W, bold=0.04)

    w, h = p.region('pizza', 128, 128, '#ece6d6')
    p.frame(6, 6, w - 12, h - 12, 3, R, '#ece6d6', 4)
    p.circle(64, 52, 30, '#c98a3c')
    p.circle(64, 52, 25, '#d9b04a')
    for cx, cy in ((54, 44), (74, 46), (62, 64), (78, 62), (50, 60)):
        p.circle(cx, cy, 5, R)
    for a in (20, 80, 140):
        dx, dy = 30 * math.cos(math.radians(a)), 30 * math.sin(math.radians(a))
        p.line((64 - dx, 52 - dy), (64 + dx, 52 + dy), 1.5, '#a8702c')
    p.text('PIZZA', 64, 100, 17, R, bold=0.04)

    # ------------------------------------------------------------ cardboard, paper, labels
    w, h = p.region('ship_label', 64, 48, W)
    p.rect(4, 4, 56, 9, K_)
    for i, x in enumerate((6, 10, 13, 18, 21, 27, 30, 36, 41, 44, 50, 54)):
        p.rect(x, 30, 2 + i % 2, 14, K_)
    p.rect(4, 17, 40, 2, '#55585c')
    p.rect(4, 23, 30, 2, '#55585c')
    w, h = p.region('box_marks', 112, 48, CARD)
    ink = '#6b4a2b'
    for x in (16, 38):
        p.arrow((x, 40), (x, 8), 6, ink, head=2.0)
    p.rect(8, 42, 38, 3, ink)
    p.poly([(60, 10), (84, 10), (76, 24), (68, 24)], ink)
    p.rect(70, 24, 4, 12, ink)
    p.rect(63, 36, 18, 3, ink)
    p.lines([(92, 8), (104, 8), (104, 40), (92, 40)], 2.5, ink, closed=True)
    w, h = p.region('flyer_a', 64, 80, Y)
    p.text('SALE', 32, 18, 16, K_, bold=0.04)
    p.rect(8, 34, 48, 16, R)
    for i in range(4):
        p.rect(8, 56 + i * 5, 48 - i * 6, 2, K_)
    w, h = p.region('flyer_b', 64, 80, W)
    p.text('LOST DOG', 32, 11, 8, R, bold=0.04)
    p.rect(12, 20, 40, 30, '#9a938a')
    p.circle(32, 34, 9, '#6f6257')
    for i in range(4):
        p.rect(8, 56 + i * 5, 48, 2, '#55585c')
    w, h = p.region('paper_fold', 128, 88, PAPER)
    p.text('THE COURIER', 64, 11, 10, K_, bold=0.03)
    p.rect(5, 20, 118, 2, K_)
    p.rect(5, 26, 70, 6, '#2b2b2e')
    p.rect(5, 36, 44, 46, '#7e858c')
    for i in range(10):
        p.rect(54, 36 + i * 5, 32, 2, '#8a877f')
        p.rect(91, 36 + i * 5, 32, 2, '#8a877f')

    w, h = p.region('poster', 144, 232, '#f0a35a')
    p.rect(0, 0, w, 70, '#f6c66a')
    p.circle(72, 96, 30, '#fbe6a2')
    p.poly([(0, 128), (36, 78), (66, 112), (96, 70), (144, 124), (144, 140), (0, 140)], '#3d5a52')
    p.rect(0, 128, w, 60, '#2f6f8f')
    for i, (x, y, l) in enumerate(((20, 144, 40), (80, 152, 46), (36, 164, 30), (92, 172, 34))):
        p.rect(x, y, l, 2, '#8fc3d6')
    p.rect(0, 186, w, 46, '#243b4a')
    p.text('SUMMER AT', 72, 200, 10, W, bold=0.03)
    p.text('THE LAKE', 72, 218, 13, Y, bold=0.04)
    w, h = p.region('route_map', 96, 128, W)
    p.rect(0, 0, w, 20, BL)
    p.text('ROUTES', 48, 10, 10, W, bold=0.03)
    p.lines([(14, 36), (40, 36), (60, 60), (60, 112)], 4, R)
    p.lines([(82, 30), (82, 70), (50, 90), (20, 90), (20, 116)], 4, GN)
    for x, y in ((14, 36), (40, 36), (60, 60), (60, 112), (82, 30), (82, 70), (50, 90), (20, 116)):
        p.circle(x, y, 4, K_)
        p.circle(x, y, 2, W)

    w, h = p.region('warn', 64, 64, Y)
    p.poly([(32, 6), (60, 56), (4, 56)], K_)
    p.poly([(32, 15), (52, 51), (12, 51)], Y)
    p.poly([(35, 22), (26, 38), (32, 38), (28, 50), (40, 33), (33, 33)], K_)
    w, h = p.region('meter_face', 48, 48, W)
    p.circle(24, 30, 19, K_)
    p.circle(24, 30, 16, W)
    p.rect(0, 30, 48, 18, W)
    p.poly([(24, 30), (8, 22), (11, 16)], R)
    p.line((24, 30), (34, 17), 2, K_)
    p.rect(8, 36, 32, 6, '#3a3d42')
    w, h = p.region('gas_dial', 64, 40, '#202226')
    for i in range(4):
        p.circle(10 + i * 15, 14, 6, W)
        p.line((10 + i * 15, 14), (10 + i * 15 + 4 * math.cos(i * 1.9), 14 + 4 * math.sin(i * 1.9)), 1.5, R)
    p.rect(8, 27, 48, 8, W)
    w, h = p.region('mail_label', 96, 56, W)
    p.rect(0, 0, w, 16, '#27457f')
    p.text('MAIL', 48, 8, 9, W, bold=0.04)
    for i in range(5):
        p.rect(8, 23 + i * 6, 80 if i % 2 else 60, 2, '#55585c')
    w, h = p.region('flammable', 64, 48, W)
    p.poly([(32, 3), (56, 24), (32, 45), (8, 24)], R)
    p.poly([(32, 14), (38, 26), (32, 34), (26, 26)], W)
    w, h = p.region('oil_a', 48, 64, Y)
    p.rect(0, 20, w, 24, R)
    p.text('OIL', 24, 32, 13, W, bold=0.04)
    p.text('10W', 24, 54, 7, K_, bold=0.04)
    w, h = p.region('oil_b', 48, 64, W)
    p.rect(0, 0, w, 14, BL)
    p.circle(24, 36, 13, BL)
    p.text('ATF', 24, 36, 8, W, bold=0.04)
    w, h = p.region('paint_lbl', 48, 48, W)
    p.rect(0, 0, w, 12, '#2f7f8f')
    p.circle(24, 30, 11, '#2f7f8f')
    p.rect(6, 44, 36, 2, K_)
    w, h = p.region('fire_lbl', 48, 64, R)
    p.frame(2, 2, w - 4, h - 4, 2, W, R, 3)
    p.text('FIRE', 24, 18, 11, W, bold=0.04)
    p.rect(12, 30, 24, 12, W, 2)
    p.text('PULL', 24, 52, 7, W, bold=0.04)
    w, h = p.region('danger', 96, 40, W)
    p.rect(0, 0, w, 17, R)
    p.text('DANGER', 48, 9, 9, W, bold=0.04)
    p.text('HIGH VOLTAGE', 48, 28, 7, K_, bold=0.04, maxw=86)
    w, h = p.region('lid_label', 96, 40, Y)
    p.text('KEEP LID', 48, 12, 8, K_, bold=0.04)
    p.text('CLOSED', 48, 28, 8, K_, bold=0.04)
    w, h = p.region('tires_head', 192, 44, K_)
    p.text('TIRES', 96, 22, 22, Y, bold=0.04)
    w, h = p.region('oil_head', 160, 36, W)
    p.rect(0, 0, w, 5, R)
    p.rect(0, h - 5, w, 5, R)
    p.text('MOTOR OIL', 80, 18, 13, R, bold=0.04)
    w, h = p.region('self_serve', 128, 72, BL)
    p.frame(3, 3, w - 6, h - 6, 2, W, BL, 5)
    p.text('SELF', 64, 23, 16, W, bold=0.04)
    p.text('SERVE', 64, 49, 16, W, bold=0.04)
    w, h = p.region('flag', 160, 98, W)
    for i in range(0, 7, 2):
        p.rect(0, i * 14, w, 14, '#b22a34')
    p.rect(0, 0, 66, 56, '#2b3f7e')
    for r_ in range(3):
        for c in range(4):
            p.circle(11 + c * 15, 11 + r_ * 17, 3.2, W, 10)
    w, h = p.region('dog_name', 64, 24, '#e9e2cf')
    p.text('BUDDY', 32, 12, 11, '#6b3f2a', bold=0.04)
    w, h = p.region('stencil_a', 96, 36, '#b08a5b')
    p.text('FRAGILE', 48, 18, 14, '#4a3524', bold=0.03)
    w, h = p.region('stencil_b', 96, 36, '#9c7a4f')
    p.text('APPLES', 48, 18, 14, '#7a2b22', bold=0.03)
    w, h = p.region('drum_lbl', 64, 64, W)
    p.rect(0, 0, w, 16, K_)
    p.text('55 GAL', 32, 8, 7, W, bold=0.04)
    p.poly([(32, 20), (50, 38), (32, 56), (14, 38)], OR)
    w, h = p.region('gascan', 48, 48, Y)
    p.text('GAS', 24, 14, 11, R, bold=0.05)
    p.poly([(24, 24), (32, 36), (24, 44), (16, 36)], R)
    w, h = p.region('idtag', 64, 24, Y)
    p.text('T-1047', 32, 12, 10, K_, bold=0.04)
