from flask import Flask, request, send_file, jsonify, abort
from flask_cors import CORS
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import io, re, sqlite3, json, os
from datetime import datetime

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
CORS(app)


# ── Database setup ─────────────────────────────────────────────────────────────
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "analyses.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id        TEXT PRIMARY KEY,
            name      TEXT NOT NULL,
            saved_at  TEXT NOT NULL,
            data      TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()


# ── Analysis CRUD (all under /api/ prefix) ─────────────────────────────────────

@app.route("/api/analyses", methods=["GET"])
def list_analyses():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, name, saved_at FROM analyses ORDER BY saved_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([
        {"id": r["id"], "name": r["name"], "savedAt": r["saved_at"]}
        for r in rows
    ])


@app.route("/api/analyses", methods=["POST"])
def save_analysis():
    body = request.get_json()
    aid  = body.get("id", "").strip()
    name = body.get("name", "").strip()
    data = body.get("data", {})

    if not aid or not name:
        return jsonify({"error": "id and name are required"}), 400

    now = datetime.now().strftime("%b %d, %I:%M %p")
    conn = get_db()
    conn.execute("""
        INSERT INTO analyses (id, name, saved_at, data)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name     = excluded.name,
            saved_at = excluded.saved_at,
            data     = excluded.data
    """, (aid, name, now, json.dumps(data)))
    conn.commit()
    conn.close()
    return jsonify({"id": aid, "name": name, "savedAt": now})


@app.route("/api/analyses/<aid>", methods=["GET"])
def load_analysis(aid):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM analyses WHERE id = ?", (aid,)
    ).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id":      row["id"],
        "name":    row["name"],
        "savedAt": row["saved_at"],
        "data":    json.loads(row["data"]),
    })


@app.route("/api/analyses/<aid>", methods=["DELETE"])
def delete_analysis(aid):
    conn = get_db()
    conn.execute("DELETE FROM analyses WHERE id = ?", (aid,))
    conn.commit()
    conn.close()
    return jsonify({"deleted": aid})


# ── ARGB Colors ────────────────────────────────────────────────────────────────
CY   = "FFFFFBEB"
CB   = "FFEFF6FF"
CG   = "FFF0FDF4"
CO   = "FFFFF7ED"
CP   = "FFF5F3FF"
CW   = "FFFFFFFF"
CG50 = "FFF8F9FA"
CG1  = "FFF1F3F5"
CG8  = "FF1F2937"
CG7  = "FF374151"

FW   = "FFFFFFFF"
FDK  = "FF111827"
FG6  = "FF4B5563"
FBL  = "FF1D4ED8"
FGR  = "FF15803D"
FOR  = "FFC2410C"
FRD  = "FFDC2626"
FPU  = "FF6D28D9"
FYL  = "FF92400E"


def fill(c):
    return PatternFill("solid", fgColor=c)

def font(bold=False, size=11, color=FDK):
    return Font(name="Calibri", size=size, bold=bold, color=color)

def align(h="left", wrap=True):
    valid = {"left","right","center","fill","justify","general","centerContinuous","distributed"}
    return Alignment(horizontal=h if h in valid else "left", vertical="center", wrap_text=wrap)

def thin_border():
    s = Side(style="thin", color="FFE5E7EB")
    return Border(left=s, right=s, top=s, bottom=s)

def dark_border():
    s = Side(style="thin", color="FF374151")
    return Border(left=s, right=s, top=s, bottom=s)

def sh(ws, r, c1, c2, text, bg=CG8, fc=FW, sz=10, al="center"):
    if c1 != c2:
        ws.merge_cells(start_row=r, start_column=c1, end_row=r, end_column=c2)
    cell = ws.cell(row=r, column=c1, value=text)
    cell.fill      = fill(bg)
    cell.font      = font(bold=True, size=sz, color=fc)
    cell.alignment = align(al)
    cell.border    = dark_border()
    return cell

def sc(cell, bg=None, bold=False, al="left", nf=None, fc=FDK, sz=11):
    if bg:
        cell.fill = fill(bg)
    cell.font      = font(bold=bold, size=sz, color=fc)
    cell.alignment = align(al)
    cell.border    = thin_border()
    if nf:
        cell.number_format = nf

def ug(val, unit):
    return (f'({val}*IF({unit}="lb",453.592,'
            f'IF({unit}="oz",28.34952,'
            f'IF({unit}="gal",3785.41,1))))')


def build_excel(analysis_name, sachet_grams, anchor_util_pct, what_if_units, ingredients):
    wb  = Workbook()
    ws  = wb.active
    ws.title = "RM Analysis"

    N          = len(ingredients)
    anchor_dec = anchor_util_pct / 100.0

    widths = {1:28, 2:11, 3:7, 4:11, 5:7, 6:11, 7:11, 8:10,
              9:13, 10:11, 11:14, 12:13, 13:13, 14:13, 15:13, 16:10, 17:8}
    for col, w in widths.items():
        ws.column_dimensions[get_column_letter(col)].width = w

    R_TITLE   = 1
    R_LEGEND  = 2
    R_S1      = 4
    R_SG      = 5
    R_AU      = 6
    R_S2      = 8
    R_POL_H   = 9
    R_POL_V   = 10
    R_POL_S   = 11
    R_MAT_GRP = 12
    R_MAT_COL = 13
    R_ING_F   = 14
    R_ING_L   = R_ING_F + N - 1
    R_ING_T   = R_ING_L + 1
    R_S3      = R_ING_T + 2
    R_WI_H    = R_S3 + 1
    R_WI_IN   = R_WI_H + 1
    R_CPM_H   = R_WI_IN + 1
    R_CPM_V   = R_CPM_H + 1
    R_CPM_I   = R_CPM_V + 1
    R_CPM_D   = R_CPM_I + 1
    R_SUM_H   = R_CPM_D + 2
    R_SUM_F   = R_SUM_H + 1
    R_SUM_L   = R_SUM_F + 4
    R_BRK_S   = R_SUM_L + 2
    R_BRK_GRP = R_BRK_S + 1
    R_BRK_COL = R_BRK_GRP + 1
    R_BRK_F   = R_BRK_COL + 1
    R_BRK_L   = R_BRK_F + N - 1
    R_BRK_T   = R_BRK_L + 1

    SG = f"B{R_SG}"
    AU = f"B{R_AU}"
    WI = f"B{R_WI_IN}"

    fr, lr  = R_ING_F, R_ING_L
    N_RNG   = f"$N${fr}:$N${lr}"
    Q_RNG   = f"$Q${fr}:$Q${lr}"
    O_RNG   = f"$O${fr}:$O${lr}"
    bf, bl  = R_BRK_F, R_BRK_L

    rec_moq_ref = f"A{R_POL_V}"
    plan_u      = f"IF({WI}>0,{WI},{rec_moq_ref})"

    def bc(col): return get_column_letter(col)

    # Title
    ws.row_dimensions[R_TITLE].height = 24
    sh(ws, R_TITLE, 1, 17,
       f"Raw Materials Costing & Purchasing  ·  {analysis_name or 'Analysis'}",
       bg=CG8, fc=FW, sz=13, al="left")

    # Legend
    ws.row_dimensions[R_LEGEND].height = 16
    for c1, c2, txt, bg, fc in [
        (1,3,"🟡  User Input",CY,FYL),(4,6,"🔵  Calculated",CB,FBL),
        (7,9,"🟢  $ / Cost",CG,FGR),(10,12,"🟠  Grams",CO,FOR),
        (13,17,"🟣  Anchor / Bottleneck",CP,FPU),
    ]:
        sh(ws, R_LEGEND, c1, c2, txt, bg=bg, fc=fc, sz=10, al="left")

    # Section 1
    ws.row_dimensions[R_S1].height = 18
    sh(ws, R_S1, 1, 17, "  SECTION 1 — Scenario Parameters", bg=CG8, fc=FW, sz=11, al="left")
    for row, lbl, val, nf in [
        (R_SG, "Sachet Grams (g)",       sachet_grams, "0.00"),
        (R_AU, "Anchor Utilization (%)", anchor_dec,   "0%"),
    ]:
        ws.row_dimensions[row].height = 18
        lc = ws.cell(row=row, column=1, value=lbl)
        sc(lc, bg=CG50, bold=True, al="left")
        vc = ws.cell(row=row, column=2, value=val)
        sc(vc, bg=CY, al="right", nf=nf)
        for c in range(3, 18):
            sc(ws.cell(row=row, column=c), bg=CG50)

    # Section 2
    ws.row_dimensions[R_S2].height = 18
    sh(ws, R_S2, 1, 17,
       "  SECTION 2 — Recipe & Vendor Input  ·  Policy Summary & Ingredient Matrix",
       bg=CG8, fc=FW, sz=11, al="left")

    ws.row_dimensions[R_POL_H].height = 15
    ws.row_dimensions[R_POL_V].height = 26
    ws.row_dimensions[R_POL_S].height = 13

    rec_moq_f = (
        f'=IFERROR(CEILING('
        f'SUMPRODUCT(({Q_RNG}="Y")*{O_RNG}*{N_RNG})/'
        f'SUMPRODUCT(({Q_RNG}="Y")*{N_RNG})'
        f',1),0)'
    )
    for c1, c2, hdr, formula, nf, bg, fc, sub in [
        (1,4,"Recommended MOQ",rec_moq_f,'#,##0 "units"',CY,FYL,
         "SUMPRODUCT(uth×score) ÷ SUMPRODUCT(score)  [Eligible=Y only]"),
        (5,8,"Recipe Cost / Unit",f"=SUM(K{fr}:K{lr})",'"$"#,##0.0000',CG,FGR,
         "at 100% efficiency  (ideal)"),
        (9,12,"Recipe Cost / Gram",f"=IFERROR(SUM(K{fr}:K{lr})/{SG},0)",'"$"#,##0.000000',CG,FGR,
         "at 100% efficiency  (ideal)"),
        (13,17,"Minimum MOQ Cost",f"=SUM(M{fr}:M{lr})",'"$"#,##0.00',CB,FBL,
         "sum of all 1× MOQ purchase costs"),
    ]:
        sh(ws, R_POL_H, c1, c2, hdr, bg=CG7, fc=FW, sz=9, al="center")
        ws.merge_cells(start_row=R_POL_V, start_column=c1, end_row=R_POL_V, end_column=c2)
        vc = ws.cell(row=R_POL_V, column=c1, value=formula)
        vc.fill=fill(bg); vc.font=Font(name="Calibri",size=16,bold=True,color=fc)
        vc.alignment=align("center"); vc.border=dark_border(); vc.number_format=nf
        ws.merge_cells(start_row=R_POL_S, start_column=c1, end_row=R_POL_S, end_column=c2)
        sc2 = ws.cell(row=R_POL_S, column=c1, value=sub)
        sc2.fill=fill(CG50); sc2.font=Font(name="Calibri",size=9,color="FF6B7280")
        sc2.alignment=align("center"); sc2.border=thin_border()

    # Matrix group headers
    ws.row_dimensions[R_MAT_GRP].height = 13
    for c1, c2, lbl, bg, fc, al in [
        (1,1,"Ingredient",CG8,FW,"left"),(2,7,"Vendor Inputs",CG8,FW,"center"),
        (8,8,"Recipe",CG7,"FF86EFAC","center"),(9,11,"Recipe Costs",CG7,"FF86EFAC","center"),
        (12,13,"MOQ Reference",CG7,"FFFDBA74","center"),(14,17,"Anchor Analysis",CG8,"FFC4B5FD","center"),
    ]:
        sh(ws, R_MAT_GRP, c1, c2, lbl, bg=bg, fc=fc, sz=9, al=al)

    # Matrix column headers
    ws.row_dimensions[R_MAT_COL].height = 34
    for col, lbl, bg, al in [
        (1,"Ingredient\nName",CG8,"left"),(2,"Vendor\nMOQ",CG8,"center"),
        (3,"Unit",CG8,"center"),(4,"Purch.\nIncrement",CG8,"center"),
        (5,"PI\nUnit",CG8,"center"),(6,"PI (g)",CG8,"center"),
        (7,"Cost / unit",CG8,"center"),(8,"Formula %",CG7,"center"),
        (9,"Cost / g",CG7,"center"),(10,"g / Unit",CG7,"center"),
        (11,"Cost / Unit\n(Ideal)",CG7,"center"),(12,"MOQ (g)",CG7,"center"),
        (13,"MOQ Cost $",CG7,"center"),(14,"Anchor\nScore $",CG8,"center"),
        (15,"Units to\nHit Target",CG8,"center"),(16,"Anchor\nRank",CG8,"center"),
        (17,"Elig.\nY/N",CG8,"center"),
    ]:
        c = ws.cell(row=R_MAT_COL, column=col, value=lbl)
        sc(c, bg=bg, bold=True, al=al, fc=FW, sz=9)
        c.alignment = Alignment(horizontal=al, vertical="center", wrap_text=True)

    # Ingredient rows
    UNIT_TO_G = {"lb":453.592,"g":1,"oz":28.34952,"gal":3785.41}
    for i, ing in enumerate(ingredients):
        row = R_ING_F + i
        ws.row_dimensions[row].height = 16

        moq       = float(ing.get("moq") or 0)
        unit      = ing.get("unit") or "lb"
        pi_val    = float(ing.get("pi") or 0)
        pi_unit   = ing.get("piUnit") or ""
        cost_val  = float(ing.get("costPerLb") or 0)
        cost_unit = ing.get("costUnit") or "lb"
        pct       = float(ing.get("pct") or 0)
        anchor    = ing.get("anchorOvr") or ("Y" if cost_val > 0 else "N")
        lcg_val   = cost_val / UNIT_TO_G.get(cost_unit, 453.592)

        rB=f"B{row}";rC=f"C{row}";rD=f"D{row}";rE=f"E{row}"
        rF=f"F{row}";rG=f"G{row}";rH=f"H{row}";rI=f"I{row}"
        rJ=f"J{row}";rK=f"K{row}";rL=f"L{row}";rM=f"M{row}"
        rN=f"N{row}";rO=f"O{row}";rP=f"P{row}";rQ=f"Q{row}"

        moq_g = (f'IF({rC}="lb",{rB}*453.592,'
                 f'IF({rC}="oz",{rB}*28.34952,'
                 f'IF({rC}="gal",{rB}*3785.41,{rB})))')

        pi_g_f = (
            f'=IF(OR({rD}="",{rD}=0),"—",'
            f'IF(OR({rE}="",{rE}={rC}),'
            f'{ug(rD,rC)},{ug(rD,rE)}))'
        )

        for col, val, al, nf in [
            (1,ing.get("name",""),"left",None),(2,moq,"right","#,##0.##"),
            (3,unit,"center",None),(4,pi_val,"right","#,##0.##"),
            (5,pi_unit,"center",None),(7,cost_val,"right",'"$"#,##0.0000'),
            (8,pct,"right","0.00%"),(17,anchor,"center",None),
        ]:
            c = ws.cell(row=row, column=col, value=val)
            sc(c, bg=CY, al=al, nf=nf)

        for col, formula, bg, al, nf, fc in [
            (6,  pi_g_f,                                                         CB,"right","#,##0.00",FBL),
            (9,  lcg_val,                                                         CW,"right",'"$"#,##0.000000',FGR),
            (10, f"={SG}*{rH}",                                                   CW,"right","#,##0.0000",FDK),
            (11, f"={rJ}*{rI}",                                                   CG,"right",'"$"#,##0.000000',FGR),
            (12, f"={moq_g}",                                                     CW,"right","#,##0.00",FDK),
            (13, f"={rL}*{rI}",                                                   CO,"right",'"$"#,##0.00',FOR),
            (14, f'=IF({rQ}="Y",{rM}*{AU},0)',                                    CO,"right",'"$"#,##0.00',FOR),
            (15, f'=IFERROR(IF({rQ}="Y",({moq_g}*{AU})/{rJ},0),0)',              CP,"right","#,##0",FPU),
            (16, f'=IFERROR(IF(AND({rQ}="Y",{rN}>0),'
                 f'1+COUNTIFS({N_RNG},">"&{rN},{Q_RNG},"Y"),"—"),"—")',          CW,"center",None,FDK),
        ]:
            c = ws.cell(row=row, column=col, value=formula)
            sc(c, bg=bg, al=al, nf=nf, fc=fc)

    # Ingredient totals
    tr = R_ING_T
    ws.row_dimensions[tr].height = 18
    ws.merge_cells(start_row=tr, start_column=1, end_row=tr, end_column=7)
    sc(ws.cell(row=tr, column=1, value="TOTALS"), bg=CG1, bold=True, al="left")
    for col, val, nf, bg, fc in [
        (8,f"=SUM(H{fr}:H{lr})","0.00%",CY,FDK),(9,"",None,CG1,FDK),
        (10,f"={SG}",'0.00" g"',CG1,FDK),(11,f"=SUM(K{fr}:K{lr})",'"$"#,##0.000000',CG,FGR),
        (12,"",None,CG1,FDK),(13,f"=SUM(M{fr}:M{lr})",'"$"#,##0.00',CO,FOR),
        (14,f"=SUM(N{fr}:N{lr})",'"$"#,##0.00',CO,FOR),
        (15,"",None,CG1,FDK),(16,"",None,CG1,FDK),(17,"",None,CG1,FDK),
    ]:
        c = ws.cell(row=tr, column=col, value=val)
        sc(c, bg=bg, bold=True, al="right", nf=nf, fc=fc)

    # Section 3
    ws.row_dimensions[R_S3].height = 18
    sh(ws, R_S3, 1, 17, "  SECTION 3 — What-If Scenario Analysis", bg=CG8, fc=FW, sz=11, al="left")
    ws.row_dimensions[R_WI_H].height = 15
    sh(ws, R_WI_H, 1, 17, "  What-If Inputs & Summary", bg=CG7, fc=FW, sz=10, al="left")
    ws.row_dimensions[R_WI_IN].height = 20
    lc = ws.cell(row=R_WI_IN, column=1, value="What-If Units")
    sc(lc, bg=CG50, bold=True, al="left")
    vc = ws.cell(row=R_WI_IN, column=2, value=what_if_units or 0)
    sc(vc, bg=CY, bold=True, al="right", nf="#,##0")
    for c in range(3, 18):
        sc(ws.cell(row=R_WI_IN, column=c), bg=CG50)

    purg_sum  = f"SUM({bc(5)}{bf}:{bc(5)}{bl})"
    reqg_sum  = f"SUM({bc(2)}{bf}:{bc(2)}{bl})"
    purd_sum  = f"SUM({bc(8)}{bf}:{bc(8)}{bl})"
    usedd_sum = f"SUM({bc(9)}{bf}:{bc(9)}{bl})"

    for r in [R_CPM_H, R_CPM_V, R_CPM_I, R_CPM_D]:
        ws.row_dimensions[r].height = 18

    sh(ws, R_CPM_H, 1, 8, "Cost / Gram", bg=CG7, fc=FW, sz=10, al="center")
    sh(ws, R_CPM_H, 9, 17, "Cost / Unit", bg=CG7, fc=FW, sz=10, al="center")

    cpg_wi    = f"=IFERROR({purd_sum}/({plan_u}*{SG}),0)"
    cpg_ideal = f"=IFERROR(SUM(K{fr}:K{lr})/{SG},0)"
    cpg_delta = f"=IFERROR({purd_sum}/({plan_u}*{SG})-SUM(K{fr}:K{lr})/{SG},0)"
    cpu_wi    = f"=IFERROR({purd_sum}/({plan_u}),0)"
    cpu_ideal = f"=SUM(K{fr}:K{lr})"
    cpu_delta = f"=IFERROR({purd_sum}/({plan_u})-SUM(K{fr}:K{lr}),0)"

    for c1, c2 in [(1,4),(5,8),(9,13),(14,17)]:
        ws.merge_cells(start_row=R_CPM_V, start_column=c1, end_row=R_CPM_V, end_column=c2)
    for c1, lbl in [(1,"What-If"),(5,"Ideal"),(9,"What-If"),(14,"Ideal")]:
        c = ws.cell(row=R_CPM_V, column=c1, value=lbl)
        sc(c, bg=CG50, bold=True, al="center", fc=FG6, sz=10)

    for c1, c2 in [(1,4),(5,8),(9,13),(14,17)]:
        ws.merge_cells(start_row=R_CPM_I, start_column=c1, end_row=R_CPM_I, end_column=c2)
    for c1, formula, bg, fc, nf in [
        (1,cpg_wi,CB,FBL,'"$"#,##0.000000'),(5,cpg_ideal,CG,FGR,'"$"#,##0.000000'),
        (9,cpu_wi,CB,FBL,'"$"#,##0.0000'),(14,cpu_ideal,CG,FGR,'"$"#,##0.0000'),
    ]:
        c = ws.cell(row=R_CPM_I, column=c1, value=formula)
        c.fill=fill(bg); c.font=Font(name="Calibri",size=14,bold=True,color=fc)
        c.alignment=align("center"); c.border=thin_border(); c.number_format=nf

    ws.merge_cells(start_row=R_CPM_D, start_column=1, end_row=R_CPM_D, end_column=8)
    ws.merge_cells(start_row=R_CPM_D, start_column=9, end_row=R_CPM_D, end_column=17)
    for c1, formula, nf in [
        (1,cpg_delta,'"Δ $"#,##0.000000;[Red]"Δ $"#,##0.000000'),
        (9,cpu_delta,'"Δ $"#,##0.0000;[Red]"Δ $"#,##0.0000'),
    ]:
        c = ws.cell(row=R_CPM_D, column=c1, value=formula)
        sc(c, bg=CG50, bold=True, al="center", fc=FGR, nf=nf)

    ws.row_dimensions[R_SUM_H].height = 15
    sh(ws, R_SUM_H, 1, 8, "  Grams Analysis", bg=CG8, fc=FW, sz=10, al="left")
    sh(ws, R_SUM_H, 9, 17, "  $ Analysis",    bg=CG8, fc=FW, sz=10, al="left")

    lef_g_sum = f"IFERROR({purg_sum}-{reqg_sum},0)"
    lef_d_sum = f"IFERROR({purd_sum}-{usedd_sum},0)"
    for idx, (lg,fg,nfg,fcg,ld,fd,nfd,fcd) in enumerate([
        ("Total Purchased",f"={purg_sum}",'#,##0.0" g"',FBL,"Total Purchased",f"={purd_sum}",'"$"#,##0.00',FBL),
        ("Total Used",f"={reqg_sum}",'#,##0.0" g"',FGR,"Total Used",f"={usedd_sum}",'"$"#,##0.00',FGR),
        ("Total Leftover",f"={lef_g_sum}",'#,##0.0" g"',FOR,"Total Leftover",f"={lef_d_sum}",'"$"#,##0.00',FRD),
        ("Grams Util %",f"=IFERROR({reqg_sum}/{purg_sum},0)","0.0%",FGR,"$ Util %",f"=IFERROR({usedd_sum}/{purd_sum},0)","0.0%",FGR),
        ("Grams At Risk %",f"=IFERROR(({purg_sum}-{reqg_sum})/{purg_sum},0)","0.0%",FRD,"$ At Risk %",f"=IFERROR(({purd_sum}-{usedd_sum})/{purd_sum},0)","0.0%",FRD),
    ]):
        r = R_SUM_F + idx
        ws.row_dimensions[r].height = 18
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
        lc = ws.cell(row=r, column=1, value=lg); sc(lc, bg=CG50, bold=True, al="left")
        ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=8)
        vc = ws.cell(row=r, column=5, value=fg)
        vc.fill=fill(CG50); vc.font=Font(name="Calibri",size=13,bold=True,color=fcg)
        vc.alignment=align("right"); vc.border=thin_border(); vc.number_format=nfg
        ws.merge_cells(start_row=r, start_column=9, end_row=r, end_column=13)
        ld2 = ws.cell(row=r, column=9, value=ld); sc(ld2, bg=CG50, bold=True, al="left")
        ws.merge_cells(start_row=r, start_column=14, end_row=r, end_column=17)
        vd = ws.cell(row=r, column=14, value=fd)
        vd.fill=fill(CG50); vd.font=Font(name="Calibri",size=13,bold=True,color=fcd)
        vd.alignment=align("right"); vd.border=thin_border(); vd.number_format=nfd

    # Breakdown
    ws.row_dimensions[R_BRK_S].height = 18
    sh(ws, R_BRK_S, 1, 9, '  What-If Ingredient Breakdown', bg=CG8, fc=FW, sz=11, al="left")
    ws.merge_cells(start_row=R_BRK_S, start_column=10, end_row=R_BRK_S, end_column=12)
    note = ws.cell(row=R_BRK_S, column=10, value=f'="@ "&TEXT({plan_u},"#,##0")&" units"')
    sc(note, bg=CG8, al="right", fc="FF9CA3AF", sz=9)

    ws.row_dimensions[R_BRK_GRP].height = 12
    for c1, c2, lbl, bg, fc, al in [
        (1,1,"Ingredient",CG8,FW,"left"),(2,5,"Grams Analysis",CG7,"FFFDBA74","center"),
        (6,7,"Grams Util",CG7,FW,"center"),(8,10,"$ Analysis",CG7,"FF86EFAC","center"),
        (11,12,"$ Util",CG7,FW,"center"),
    ]:
        sh(ws, R_BRK_GRP, c1, c2, lbl, bg=bg, fc=fc, sz=9, al=al)

    ws.row_dimensions[R_BRK_COL].height = 28
    for col, lbl, bg, al in [
        (1,"Ingredient Name",CG8,"left"),(2,"g Needed",CG7,"center"),
        (3,"# MOQs",CG7,"center"),(4,"# PIs",CG7,"center"),
        (5,"g to Buy",CG8,"center"),(6,"Leftover g",CG8,"center"),
        (7,"Gram Util %",CG8,"center"),(8,"Purchased $",CG8,"center"),
        (9,"Used $",CG8,"center"),(10,"Leftover $",CG8,"center"),
        (11,"$ Util %",CG7,"center"),(12,"Cost / g",CG7,"center"),
    ]:
        c = ws.cell(row=R_BRK_COL, column=col, value=lbl)
        sc(c, bg=bg, bold=True, al=al, fc=FW, sz=9)
        c.alignment = Alignment(horizontal=al, vertical="center", wrap_text=True)

    for i in range(N):
        ir  = R_ING_F + i
        row = R_BRK_F + i
        ws.row_dimensions[row].height = 16

        rBi=f"B{ir}"; rCi=f"C{ir}"; rFi=f"F{ir}"
        rIi=f"I{ir}"; rJi=f"J{ir}"

        moq_gi = (f'IF({rCi}="lb",{rBi}*453.592,'
                  f'IF({rCi}="oz",{rBi}*28.34952,'
                  f'IF({rCi}="gal",{rBi}*3785.41,{rBi})))')
        pi_g_safe = f'IF(ISNUMBER({rFi}),{rFi},0)'

        for col, formula, bg, al, nf, fc in [
            (1,  f"=A{ir}",                                                        CW,"left",  None,              FDK),
            (2,  f"={rJi}*{plan_u}",                                               CW,"right", "#,##0.00",        FOR),
            (3,  "=1",                                                             CW,"center","#,##0",            FDK),
            (4,  f'=IFERROR(IF(OR({pi_g_safe}=0,{moq_gi}>=B{row}),0,'
                 f'CEILING((B{row}-{moq_gi})/{pi_g_safe},1)),0)',                  CB,"center","#,##0",            FBL),
            (5,  f'=IF({pi_g_safe}=0,MAX(B{row},{moq_gi}),'
                 f'{moq_gi}+D{row}*{pi_g_safe})',                                  CO,"right", "#,##0.00",        FOR),
            (6,  f"=E{row}-B{row}",                                                CW,"right", "#,##0.00",        FDK),
            (7,  f"=IFERROR(B{row}/E{row},0)",                                     CW,"center","0.0%",            FDK),
            (8,  f"=E{row}*{rIi}",                                                 CG,"right", '"$"#,##0.00',     FGR),
            (9,  f"=B{row}*{rIi}",                                                 CG,"right", '"$"#,##0.00',     FGR),
            (10, f"=H{row}-I{row}",                                                CW,"right", '"$"#,##0.00',     FRD),
            (11, f"=IFERROR(I{row}/H{row},0)",                                     CW,"center","0.0%",            FDK),
            (12, f"={rIi}",                                                        CW,"right", '"$"#,##0.000000', FG6),
        ]:
            c = ws.cell(row=row, column=col, value=formula)
            sc(c, bg=bg, al=al, nf=nf, fc=fc)

    tr2 = R_BRK_T
    ws.row_dimensions[tr2].height = 18
    ws.merge_cells(start_row=tr2, start_column=1, end_row=tr2, end_column=4)
    sc(ws.cell(row=tr2, column=1, value="TOTALS"), bg=CG1, bold=True, al="left")
    for col, formula, nf, bg, fc in [
        (5,  f"=SUM(E{bf}:E{bl})", "#,##0.00",    CO,  FOR),
        (6,  f"=SUM(F{bf}:F{bl})", "#,##0.00",    CW,  FDK),
        (7,  f"=IFERROR(SUM(B{bf}:B{bl})/E{tr2},0)","0.0%",CW,FDK),
        (8,  f"=SUM(H{bf}:H{bl})", '"$"#,##0.00', CG,  FGR),
        (9,  f"=SUM(I{bf}:I{bl})", '"$"#,##0.00', CG,  FGR),
        (10, f"=SUM(J{bf}:J{bl})", '"$"#,##0.00', CW,  FRD),
        (11, f"=IFERROR(I{tr2}/H{tr2},0)", "0.0%",CW,  FDK),
        (12, "", None, CG1, FDK),
    ]:
        c = ws.cell(row=tr2, column=col, value=formula)
        sc(c, bg=bg, bold=True, al="right", nf=nf, fc=fc)

    foot_row = tr2 + 2
    ws.row_dimensions[foot_row].height = 14
    ws.merge_cells(start_row=foot_row, start_column=1, end_row=foot_row, end_column=17)
    fc2 = ws.cell(row=foot_row, column=1,
                  value='="Raw Material Analysis Tool  ·  Generated: "&TEXT(TODAY(),"MMM D, YYYY")')
    fc2.fill=fill(CG50); fc2.font=Font(name="Calibri",size=9,color="FF9CA3AF")
    fc2.alignment=align("center"); fc2.border=thin_border()
    ws.freeze_panes = f"B{R_ING_F}"
    return wb


# ── Export endpoint ────────────────────────────────────────────────────────────
@app.route("/export", methods=["POST"])
def export():
    data = request.get_json()
    raw  = data.get("anchorUtil") or data.get("dollarWt")
    if raw is None:
        anchor_util_pct = 95.0
    else:
        anchor_util_pct = float(raw)
        if anchor_util_pct <= 1.0:
            anchor_util_pct *= 100.0

    wb = build_excel(
        analysis_name   = data.get("analysisName", "Analysis"),
        sachet_grams    = float(data.get("sachetGrams",  0) or 0),
        anchor_util_pct = anchor_util_pct,
        what_if_units   = float(data.get("whatIfUnits",  0) or 0),
        ingredients     = data.get("ings", []),
    )
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    safe = re.sub(r'[^\w\s\-]', '_', data.get("analysisName") or "Analysis")
    return send_file(buf, as_attachment=True,
                     download_name=f"{safe}.xlsx",
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ── SPA catch-all (serve React for any non-API route) ─────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    """Serve the React SPA for all non-API routes."""
    if not app.static_folder or not os.path.isdir(app.static_folder):
        abort(404)
    if path.startswith("api/") or path == "export":
        abort(404)
    dist = os.path.join(app.static_folder, path)
    if os.path.isfile(dist):
        return send_file(dist)
    index = os.path.join(app.static_folder, "index.html")
    if os.path.isfile(index):
        return send_file(index)
    abort(404)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=True)
