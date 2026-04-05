import express from 'express';
import ExcelJS from 'exceljs';
import pool from '../database/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Export to Excel
router.get('/excel', requireAuth, async (req, res) => {
  try {
    const { quarter_id } = req.query;
    
    // Get all tasks for the quarter (or all if no quarter specified)
    let tasksQuery = `
      SELECT t.*, 
             u.name as owner_name, u.email as owner_email, u.department as owner_department,
             q.year, q.quarter
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      LEFT JOIN quarters q ON t.quarter_id = q.id
      WHERE 1=1
    `;
    const params = [];
    if (quarter_id) {
      tasksQuery += ` AND t.quarter_id = $1`;
      params.push(quarter_id);
    }
    tasksQuery += ` ORDER BY u.name, t.created_at DESC`;
    
    const tasksResult = await pool.query(tasksQuery, params);
    const tasks = tasksResult.rows;
    
    // Get all users who have tasks
    const usersResult = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.department
      FROM users u
      INNER JOIN tasks t ON t.owner_id = u.id
      ${quarter_id ? 'WHERE t.quarter_id = $1' : ''}
      ORDER BY u.name
    `, params);
    const users = usersResult.rows;
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    
    // Color constants
    const NAVY = "FF1B2A4A";
    const GOLD = "FFC9A84C";
    const WHITE = "FFFFFFFF";
    const LGRAY = "FFF8FAFC";
    const MGRAY = "FFE2E8F0";
    const DGRAY = "FF64748B";
    const DARK = "FF2D3748";
    const GREEN = "FF166534";
    const GBGC = "FFDCFCE7";
    const BLUE = "FF1E40AF";
    const BBGC = "FFDBEAFE";
    const AMBER = "FF92400E";
    const ABGC = "FFFEF3C7";
    const RED = "FF991B1B";
    const RBGC = "FFFEE2E2";
    const PURPLE = "FF5B21B6";
    const PBGC = "FFEDE9FE";
    const TEAL = "FF115E59";
    const TBGC = "FFCCFBF1";
    
    // Helper functions
    const F = (c) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } });
    const Ft = (c = WHITE, sz = 9, bold = false, italic = false) => ({ 
      name: "Arial", color: { argb: c }, size: sz, bold, italic 
    });
    const Al = (h = "left", v = "middle", w = false) => ({ 
      horizontal: h, vertical: v, wrapText: w 
    });
    const Br = () => ({
      top: { style: "thin", color: { argb: MGRAY } },
      bottom: { style: "thin", color: { argb: MGRAY } },
      left: { style: "thin", color: { argb: MGRAY } },
      right: { style: "thin", color: { argb: MGRAY } }
    });
    
    const PRIO_C = {
      "Critical": [RBGC, RED],
      "High": [ABGC, AMBER],
      "Medium": [PBGC, PURPLE],
      "Low": [TBGC, TEAL]
    };
    const STAT_C = {
      "Completed": [GBGC, GREEN],
      "In Progress": [BBGC, BLUE],
      "Not Started": [LGRAY, DGRAY]
    };
    const PERF_C = {
      "On Track": [GBGC, GREEN],
      "At Risk": [ABGC, AMBER],
      "Off Track": [RBGC, RED]
    };
    const perfLabel = (p) => {
      if (p === "green") return "On Track";
      if (p === "yellow") return "At Risk";
      if (p === "red") return "Off Track";
      return "";
    };
    
    // Calculate overall stats
    const total = tasks.length;
    const compl = tasks.filter(t => t.status === "Completed").length;
    const inProg = tasks.filter(t => t.status === "In Progress").length;
    const notStart = tasks.filter(t => t.status === "Not Started").length;
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.status === "Completed") return false;
      return new Date(t.due_date) < today;
    }).length;
    const offTrack = tasks.filter(t => t.performance === "red").length;
    const atRisk = tasks.filter(t => t.performance === "yellow").length;
    const onTrack = tasks.filter(t => t.performance === "green").length;
    
    // ===== EXECUTIVE DASHBOARD SHEET =====
    const execSheet = workbook.addWorksheet("Executive Dashboard");
    execSheet.views = [{ showGridLines: false }];
    
    // Set row heights and column widths
    execSheet.getRow(1).height = 6;
    execSheet.getRow(2).height = 44;
    execSheet.getRow(3).height = 22;
    execSheet.getRow(4).height = 10;
    execSheet.getRow(9).height = 26;
    execSheet.getRow(10).height = 14;
    execSheet.getRow(11).height = 28;
    execSheet.getRow(12).height = 22;
    
    ["A","B","C","D","E","F","G"].forEach((c,i)=>{
      execSheet.getColumn(c).width = i === 0 ? 1.5 : 17;
    });
    
    // Header - Dark blue background with gold/yellow text
    execSheet.mergeCells('B2:G2');
    const headerCell = execSheet.getCell('B2');
    headerCell.value = "CLASSERA • TASK PERFORMANCE REPORT";
    headerCell.fill = F(NAVY);
    headerCell.font = { name: "Arial", color: { argb: GOLD }, size: 20, bold: true };
    headerCell.alignment = Al("center", "middle");
    
    // Subtitle - Dark blue background with light grey/white text
    execSheet.mergeCells('B3:G3');
    const subtitleCell = execSheet.getCell('B3');
    subtitleCell.value = `Prepared for: CEO • As of ${dateStr} • ${total} Tasks • ${users.length} Owners`;
    subtitleCell.fill = F(NAVY);
    subtitleCell.font = { name: "Arial", color: { argb: "FFA0AEC0" }, size: 9, italic: true };
    subtitleCell.alignment = Al("center", "middle");
    
    // Summary cards - Match exact styling from screenshot
    const summaryCards = [
      ["B", "TOTAL TASKS", String(total), "All active tasks", NAVY, GOLD], // Dark blue bg, gold text
      ["C", "COMPLETED", String(compl), `${Math.round((compl/total)*100) || 0}% complete`, GBGC, GREEN], // Light green bg, green text
      ["D", "IN PROGRESS", String(inProg), "Currently active", BBGC, BLUE], // Light blue bg, blue text
      ["E", "NOT STARTED", String(notStart), "Pending kick-off", LGRAY, DGRAY], // Light grey bg, grey text
      ["F", "OVERDUE", String(overdue), "Past due date", RBGC, RED], // Light red bg, red text
      ["G", "OFF TRACK 🔴", String(offTrack), "Needs immediate action", RBGC, RED] // Light red bg, red text with icon
    ];
    
    summaryCards.forEach(([col, label, val, sub, bg, fg]) => {
      // Row 5: Label (small, bold)
      const labelCell = execSheet.getCell(`${col}5`);
      labelCell.value = label;
      labelCell.fill = F(bg);
      labelCell.font = { name: "Arial", color: { argb: fg }, size: 8, bold: true };
      labelCell.alignment = Al("center", "middle");
      labelCell.border = Br();
      execSheet.getRow(5).height = 18;
      
      // Row 6: Value (large, bold)
      const valueCell = execSheet.getCell(`${col}6`);
      valueCell.value = val;
      valueCell.fill = F(bg);
      valueCell.font = { name: "Arial", color: { argb: fg }, size: 30, bold: true };
      valueCell.alignment = Al("center", "middle");
      valueCell.border = Br();
      execSheet.getRow(6).height = 46;
      
      // Row 7: Sublabel (small, italic)
      const sublabelCell = execSheet.getCell(`${col}7`);
      sublabelCell.value = sub;
      sublabelCell.fill = F(bg);
      sublabelCell.font = { name: "Arial", color: { argb: fg }, size: 8, italic: true };
      sublabelCell.alignment = Al("center", "middle");
      sublabelCell.border = Br();
      execSheet.getRow(7).height = 18;
    });
    
    // Progress bar
    execSheet.mergeCells('B9:G9');
    const progressPct = total === 0 ? 0 : Math.round((compl / total) * 100);
    const filled = Math.round(progressPct / 100 * 28);
    const progressBarCell = execSheet.getCell('B9');
    progressBarCell.value = `  Overall Progress   ${"█".repeat(filled)}${"░".repeat(28 - filled)}   ${progressPct}% Complete`;
    progressBarCell.fill = F(NAVY);
    progressBarCell.font = { name: "Courier New", color: { argb: WHITE }, size: 10, bold: true };
    progressBarCell.alignment = Al("left");
    
    // Performance by Owner header
    execSheet.mergeCells('B11:G11');
    const perfHeaderCell = execSheet.getCell('B11');
    perfHeaderCell.value = "  ▶  PERFORMANCE BY OWNER";
    perfHeaderCell.fill = F(NAVY);
    perfHeaderCell.font = Ft(WHITE, 10, true);
    perfHeaderCell.alignment = Al("left");
    
    // Performance by Owner table headers
    ["Owner", "Total", "Completed", "In Progress", "Not Started", "Performance"].forEach((h, i) => {
      const c = execSheet.getCell(12, i + 2);
      c.value = h;
      c.fill = F(DARK);
      c.font = { name: "Arial", color: { argb: WHITE }, size: 9, bold: true };
      c.alignment = Al("center", "middle");
      c.border = Br();
    });
    
    // Sort owners by task count (descending)
    const sortedUsers = [...users].sort((a, b) => {
      const aTasks = tasks.filter(t => t.owner_id === a.id).length;
      const bTasks = tasks.filter(t => t.owner_id === b.id).length;
      return bTasks - aTasks;
    });
    
    sortedUsers.forEach((u, ri) => {
      const row = 13 + ri;
      execSheet.getRow(row).height = 20;
      const ownerTasks = tasks.filter(t => t.owner_id === u.id);
      const ownerTotal = ownerTasks.length;
      const ownerCompl = ownerTasks.filter(t => t.status === "Completed").length;
      const ownerInProg = ownerTasks.filter(t => t.status === "In Progress").length;
      const ownerNotStart = ownerTasks.filter(t => t.status === "Not Started").length;
      const ownerPerf = ownerTotal === 0 ? 0 : Math.round((ownerCompl / ownerTotal) * 100);
      
      // Determine performance icon based on percentage and status
      // From screenshot: Red for low (<25%), Yellow for medium (25-49%), Green for high (>=50%)
      // But also consider off-track/at-risk tasks
      const ownerOffTrack = ownerTasks.filter(t => t.performance === "red").length;
      const ownerAtRisk = ownerTasks.filter(t => t.performance === "yellow").length;
      let icon;
      if (ownerOffTrack > 0 || ownerPerf < 25) {
        icon = "🔴";
      } else if (ownerAtRisk > 0 || (ownerPerf >= 25 && ownerPerf < 50)) {
        icon = "🟡";
      } else {
        icon = "🟢";
      }
      
      // Alternating row background
      const bg = ri % 2 === 0 ? LGRAY : WHITE;
      
      const cells = [
        [u.name, bg, NAVY, true, "left"], // Owner name - bold, navy
        [ownerTotal, bg, DGRAY, false, "center"], // Total - grey
        [ownerCompl, bg, GREEN, true, "center"], // Completed - green, bold (always green if > 0)
        [ownerInProg, bg, DGRAY, false, "center"], // In Progress - grey
        [ownerNotStart, bg, DGRAY, false, "center"], // Not Started - grey
        [`${ownerPerf}% done ${icon}`, bg, DGRAY, false, "center"] // Performance - with icon
      ];
      
      cells.forEach(([v, b, f, bld, ha], ci) => {
        const cell = execSheet.getCell(row, ci + 2);
        cell.value = v;
        cell.fill = F(b);
        cell.font = { name: "Arial", color: { argb: f }, size: 9, bold: !!bld };
        cell.alignment = Al(ha, "middle");
        cell.border = Br();
      });
    });
    
    // ===== ALL TASKS SHEET =====
    const allTasksSheet = workbook.addWorksheet("All Tasks");
    allTasksSheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1 }];
    [[5], [46], [14], [28], [11], [14], [14], [13]].forEach(([w], i) => {
      allTasksSheet.getColumn(i + 1).width = w;
    });
    allTasksSheet.getRow(1).height = 28;
    
    const allHeaders = ["#", "Task", "Owner", "Category", "Linked Department", "Priority", "Due Date", "Status", "Performance", "OKR"];
    allHeaders.forEach((h, i) => {
      const cell = allTasksSheet.getCell(1, i + 1);
      cell.value = h;
      cell.fill = F(NAVY);
      cell.font = Ft(WHITE, 9, true);
      cell.alignment = Al(i === 0 ? "center" : "left");
      cell.border = {
        top: { style: "thin", color: { argb: MGRAY } },
        bottom: { style: "medium", color: { argb: GOLD } },
        left: { style: "thin", color: { argb: MGRAY } },
        right: { style: "thin", color: { argb: MGRAY } }
      };
    });
    
    // Sort tasks by owner name, then task name
    const sortedTasks = [...tasks].sort((a, b) => {
      const oa = users.find(u => u.id === a.owner_id)?.name || "";
      const ob = users.find(u => u.id === b.owner_id)?.name || "";
      return oa.localeCompare(ob) || a.name.localeCompare(b.name);
    });
    
    sortedTasks.forEach((t, ri) => {
      const row = ri + 2;
      allTasksSheet.getRow(row).height = 18;
      const owner = users.find(u => u.id === t.owner_id);
      const bg = ri % 2 === 0 ? LGRAY : WHITE;
      const isOv = t.due_date && new Date(t.due_date) < today && t.status !== "Completed";
      const pl = perfLabel(t.performance);
      const [pb, pf] = PRIO_C[t.priority] || [LGRAY, DGRAY];
      const [sb, sf] = STAT_C[t.status] || [LGRAY, DGRAY];
      const [pfb, pff] = PERF_C[pl] || [LGRAY, DGRAY];
      
      const cells = [
        [ri + 1, F(bg), Ft(DGRAY, 8), Al("center")],
        [t.name, F(bg), { name: "Arial", color: { argb: NAVY }, size: 9, bold: true }, Al("left", "middle", true)],
        [owner?.name || "", F(bg), Ft(DGRAY, 9), Al("center")],
        [t.category || "", F(bg), Ft(DGRAY, 9), Al("left", "middle", true)],
        [t.linked_department || "", F(bg), Ft(DGRAY, 9), Al("left", "middle", true)],
        [t.priority, F(pb), Ft(pf, 9, true), Al("center")],
        [t.due_date || "", isOv ? F(RBGC) : F(bg), isOv ? Ft(RED, 9, true) : Ft(DGRAY, 9), Al("center")],
        [t.status, F(sb), Ft(sf, 9, true), Al("center")],
        [pl, F(pfb), Ft(pff, 9, true), Al("center")],
        [(t.is_okr === 1 || t.is_okr === true) ? "Yes" : "No", F(bg), Ft(DGRAY, 9, true), Al("center")]
      ];
      
      cells.forEach(([v, fill, font, align], ci) => {
        const c = allTasksSheet.getCell(row, ci + 1);
        c.value = v;
        c.fill = fill;
        c.font = font;
        c.alignment = align;
        c.border = Br();
      });
    });
    
    // ===== INDIVIDUAL OWNER SHEETS =====
    sortedUsers.forEach((u) => {
      const ownerTasks = tasks.filter(t => t.owner_id === u.id)
        .sort((a, b) => {
          const ord = { "In Progress": 0, "Not Started": 1, "Completed": 2 };
          return (ord[a.status] ?? 3) - (ord[b.status] ?? 3) || a.name.localeCompare(b.name);
        });
      if (ownerTasks.length === 0) return;
      
      const ws = workbook.addWorksheet(u.name.substring(0, 31));
      ws.views = [{ showGridLines: false, state: "frozen", ySplit: 3 }];
      [[5], [46], [28], [11], [14], [14], [13], [30]].forEach(([w], i) => {
        ws.getColumn(i + 1).width = w;
      });
      ws.getRow(1).height = 38;
      ws.getRow(2).height = 34;
      ws.getRow(3).height = 24;
      
      // Owner header
      ws.mergeCells("A1:J1");
      const ownerHeaderCell = ws.getCell("A1");
      ownerHeaderCell.value = `  ${u.name.toUpperCase()}`;
      ownerHeaderCell.fill = F(NAVY);
      ownerHeaderCell.font = { name: "Arial", color: { argb: GOLD }, size: 14, bold: true };
      ownerHeaderCell.alignment = Al("left");
      
      // Summary stats
      const ownerTotal = ownerTasks.length;
      const ownerCompl = ownerTasks.filter(t => t.status === "Completed").length;
      const ownerInProg = ownerTasks.filter(t => t.status === "In Progress").length;
      const ownerNotStart = ownerTasks.filter(t => t.status === "Not Started").length;
      const ownerOverdue = ownerTasks.filter(t => {
        if (!t.due_date || t.status === "Completed") return false;
        return new Date(t.due_date) < today;
      }).length;
      const ownerOnTrack = ownerTasks.filter(t => t.performance === "green").length;
      const ownerAtRisk = ownerTasks.filter(t => t.performance === "yellow").length;
      const ownerOffTrack = ownerTasks.filter(t => t.performance === "red").length;
      
      [
        [`TOTAL\n${ownerTotal}`, NAVY, GOLD],
        [`COMPLETED\n${ownerCompl}`, ownerCompl > 0 ? GBGC : LGRAY, ownerCompl > 0 ? GREEN : DGRAY],
        [`IN PROGRESS\n${ownerInProg}`, ownerInProg > 0 ? BBGC : LGRAY, ownerInProg > 0 ? BLUE : DGRAY],
        [`NOT STARTED\n${ownerNotStart}`, LGRAY, DGRAY],
        [`OVERDUE\n${ownerOverdue}`, ownerOverdue > 0 ? RBGC : LGRAY, ownerOverdue > 0 ? RED : DGRAY],
        [`ON TRACK\n${ownerOnTrack}`, ownerOnTrack > 0 ? GBGC : LGRAY, ownerOnTrack > 0 ? GREEN : DGRAY],
        [`AT RISK\n${ownerAtRisk}`, ownerAtRisk > 0 ? ABGC : LGRAY, ownerAtRisk > 0 ? AMBER : DGRAY],
        [`OFF TRACK\n${ownerOffTrack}`, ownerOffTrack > 0 ? RBGC : LGRAY, ownerOffTrack > 0 ? RED : DGRAY]
      ].forEach(([v, bg, fg], ci) => {
        const c = ws.getCell(2, ci + 1);
        c.value = v;
        c.fill = F(bg);
        c.font = { name: "Arial", color: { argb: fg }, size: 9, bold: true };
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = Br();
      });
      
      // Task headers
      ["#", "Task", "Category", "Linked Department", "Priority", "Due Date", "Status", "Performance", "OKR", "Notes"].forEach((h, i) => {
        const c = ws.getCell(3, i + 1);
        c.value = h;
        c.fill = F(DARK);
        c.font = Ft(WHITE, 9, true);
        c.alignment = Al(i === 0 ? "center" : "left");
        c.border = Br();
      });
      
      // Task rows
      ownerTasks.forEach((t, ri) => {
        const row = ri + 4;
        ws.getRow(row).height = 18;
        const bg = ri % 2 === 0 ? LGRAY : WHITE;
        const isOv = t.due_date && new Date(t.due_date) < today && t.status !== "Completed";
        const pl = perfLabel(t.performance);
        const [pb, pf] = PRIO_C[t.priority] || [LGRAY, DGRAY];
        const [sb, sf] = STAT_C[t.status] || [LGRAY, DGRAY];
        const [pfb, pff] = PERF_C[pl] || [LGRAY, DGRAY];
        
        const cells = [
          [ri + 1, F(bg), Ft(DGRAY, 8), Al("center")],
          [t.name, F(bg), { name: "Arial", color: { argb: NAVY }, size: 9, bold: true }, Al("left", "middle", true)],
          [t.category || "", F(bg), Ft(DGRAY, 9), Al("left", "middle", true)],
          [t.linked_department || "", F(bg), Ft(DGRAY, 9), Al("left", "middle", true)],
          [t.priority, F(pb), Ft(pf, 9, true), Al("center")],
          [t.due_date || "", isOv ? F(RBGC) : F(bg), isOv ? Ft(RED, 9, true) : Ft(DGRAY, 9), Al("center")],
          [t.status, F(sb), Ft(sf, 9, true), Al("center")],
          [pl, F(pfb), Ft(pff, 9, true), Al("center")],
          [(t.is_okr === 1 || t.is_okr === true) ? "Yes" : "No", F(bg), Ft(DGRAY, 9, true), Al("center")],
          [t.notes || "", F(bg), Ft(DGRAY, 9), Al("left", "middle", true)]
        ];
        
        cells.forEach(([v, fill, font, align], ci) => {
          const c = ws.getCell(row, ci + 1);
          c.value = v;
          c.fill = fill;
          c.font = font;
          c.alignment = align;
          c.border = Br();
        });
      });
    });
    
    // Generate buffer and send
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Classera_Report_${today.toISOString().slice(0, 10)}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

export default router;
