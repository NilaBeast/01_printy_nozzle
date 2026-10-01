/**
 * Bambu Studio (free) CLI integration — exact same slicing as Bambu Studio.
 *
 * Preferred engine: the free, open-source Bambu Studio headless slicer:
 *   bambu-studio --slice 1 --load-settings "machine.json;process.json"
 *                --load-filaments "filament.json"
 *                --export-3mf out.gcode.3mf model.stl
 * The exported 3MF contains Metadata/plate_1.gcode, which we parse for the
 * EXACT filament weight + print time Bambu Studio itself reports.
 *
 * Fallback engine (same PrusaSlicer-derived family, also free): PrusaSlicer /
 * OrcaSlicer / SuperSlicer CLI:
 *   prusa-slicer --export-gcode --load base.ini --output out.gcode model.stl
 *
 * When no slicer binary is installed (e.g. plain dev checkout / Vercel),
 * callers get { available: false } and must fall back to the heuristic
 * estimator in priceCalculator.js. Nothing throws for a missing binary.
 *
 * No DB dependency — safe to require from anywhere.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { execFile } = require("child_process");

const PROFILES_DIR = path.join(__dirname, "..", "slicer", "profiles");
const CACHE_DIR = path.join(__dirname, "..", "..", "uploads", "slice-cache");

/* ------------------------------------------------------------------ */
/* Slicer binary discovery                                            */
/* ------------------------------------------------------------------ */

const CANDIDATE_BINARIES = [
  // Explicit admin override wins.
  process.env.BAMBU_STUDIO_BIN,
  process.env.SLICER_BIN,
  // Bambu Studio (free, preferred — exact Bambu numbers).
  "bambu-studio",
  "bambu_studio",
  // Same-engine free fallbacks (PrusaSlicer family Bambu forked from).
  "prusa-slicer",
  "prusaslicer",
  "orcaslicer",
  "orca-slicer",
  "super-slicer",
  "supermodel",
];

const WINDOWS_DEFAULT_PATHS = [
  "C:\\Program Files\\Bambu Studio\\bambu-studio.exe",
  "C:\\Program Files (x86)\\Bambu Studio\\bambu-studio.exe",
  path.join(os.homedir(), "AppData", "Local", "Bambu Studio", "bambu-studio.exe"),
  "C:\\Program Files\\PrusaSlicer\\prusa-slicer.exe",
  "C:\\Program Files\\OrcaSlicer\\orcaslicer.exe",
];

const POSIX_DEFAULT_PATHS = [
  "/usr/bin/bambu-studio",
  "/usr/local/bin/bambu-studio",
  "/opt/bambu-studio/bin/bambu-studio",
  "/Applications/BambuStudio.app/Contents/MacOS/BambuStudio",
  "/usr/bin/prusa-slicer",
  "/usr/local/bin/prusa-slicer",
  "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer",
  "/usr/bin/orcaslicer",
];

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return fs.existsSync(file);
  }
}

function whichOnPath(name) {
  if (!name) return null;
  const pathEnv = process.env.PATH || "";
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);
  const names = process.platform === "win32" && !/\.(exe|cmd|bat)$/i.test(name)
    ? [name + ".exe", name + ".cmd", name + ".bat", name]
    : [name];
  for (const dir of dirs) {
    for (const n of names) {
      const full = path.join(dir, n);
      if (isExecutable(full)) return full;
    }
  }
  return null;
}

function classifyEngine(binaryPath) {
  const base = String(binaryPath || "").toLowerCase();
  if (base.includes("bambu")) return "bambu";
  if (base.includes("orca")) return "orca";
  if (base.includes("super")) return "supaslicer";
  if (base.includes("prusa")) return "prusa";
  return "bambu"; // bare name from PATH probe below keeps its own label
}

let statusCache = null;
let statusCacheAt = 0;

function locateSlicerBinary() {
  const seen = new Set();
  const candidates = [];
  for (const c of CANDIDATE_BINARIES) {
    if (c && !seen.has(c)) {
      seen.add(c);
      candidates.push(c);
    }
  }
  // 1. Explicit paths / PATH names in priority order.
  for (const c of candidates) {
    if (path.isAbsolute(c) || c.includes(path.sep)) {
      if (isExecutable(c)) return { binary: c, engine: classifyEngine(c) };
    } else {
      const found = whichOnPath(c);
      if (found) {
        const engine = c.includes("prusa") ? "prusa"
          : c.includes("orca") ? "orca"
          : c.includes("super") ? "supaslicer"
          : "bambu";
        return { binary: found, engine };
      }
    }
  }
  // 2. Well-known install locations.
  const defaults = process.platform === "win32" ? WINDOWS_DEFAULT_PATHS : POSIX_DEFAULT_PATHS;
  for (const p of defaults) {
    if (isExecutable(p)) return { binary: p, engine: classifyEngine(p) };
  }
  return null;
}

function runBinary(binary, args, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve) => {
    execFile(binary, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

/**
 * Public: is a free slicer CLI available? Never throws, cheap (cached 60s).
 * Response shape is also what GET /printing/slicer-status returns.
 */
async function getSlicerStatus() {
  const now = Date.now();
  if (statusCache && now - statusCacheAt < 60000) return statusCache;
  const found = locateSlicerBinary();
  if (!found) {
    statusCache = {
      available: false,
      engine: null,
      binary: null,
      version: null,
      printer: BAMBU_PRINTER_LABEL,
      profile: DEFAULT_PROCESS_LABEL,
      message: "No slicer CLI found. Install the free Bambu Studio and set BAMBU_STUDIO_BIN, or put bambu-studio / prusa-slicer on PATH. Falling back to the built-in estimator.",
    };
    statusCacheAt = now;
    return statusCache;
  }
  let version = null;
  const probed = await runBinary(found.binary, ["--help"], { timeoutMs: 15000 });
  const helpText = `${probed.stdout}\n${probed.stderr}`;
  const m = helpText.match(/(?:bambu studio|prusa ?slicer|orca ?slicer|version)\D{0,20}(\d+\.\d+(?:\.\d+)?)/i)
    || helpText.match(/(\d+\.\d+\.\d+)/);
  if (m) version = m[1];
  statusCache = {
    available: !probed.err || /usage|slice|load-settings|export/i.test(helpText),
    engine: found.engine,
    binary: found.binary,
    version,
    printer: BAMBU_PRINTER_LABEL,
    profile: DEFAULT_PROCESS_LABEL,
    message: null,
  };
  // If --help itself failed hard, treat as unavailable but keep the path for debugging.
  if (probed.err && !statusCache.available) {
    statusCache.available = false;
    statusCache.message = `Found ${found.binary} but it did not respond to --help. Check BAMBU_STUDIO_BIN.`;
  }
  statusCacheAt = now;
  return statusCache;
}

/* ------------------------------------------------------------------ */
/* Bambu Studio configuration — mirrors Bambu Studio 0.20mm Standard  */
/* ------------------------------------------------------------------ */

// The printer + process shown in the storefront AND used for slicing, so the
// quoted price/configs are the exact same as slicing in Bambu Studio.
const BAMBU_PRINTER_ID = process.env.BAMBU_PRINTER || "Bambu Lab P1S 0.4 nozzle";
const BAMBU_PRINTER_LABEL = process.env.BAMBU_PRINTER || "Bambu Lab P1S · 0.4 nozzle · 256×256×256mm";
const DEFAULT_PROCESS_LABEL = "0.20mm Standard @BBL P1S (2 walls · grid infill · tree-auto supports)";

// Storefront material id/slug → Bambu filament preset + slicer physics.
const FILAMENT_MAP = {
  pla:       { preset: "Bambu PLA Basic",       density: 1.24, nozzleTemp: 220, bedTemp: 65 },
  "pla-plus":{ preset: "Bambu PLA Tough",       density: 1.24, nozzleTemp: 220, bedTemp: 65 },
  "pla-matte":{ preset: "Bambu PLA Matte",      density: 1.24, nozzleTemp: 220, bedTemp: 65 },
  petg:      { preset: "Bambu PETG HF",         density: 1.27, nozzleTemp: 255, bedTemp: 80 },
  "petg-hs": { preset: "Bambu PETG HF",         density: 1.27, nozzleTemp: 255, bedTemp: 80 },
  "tpu-95a": { preset: "Bambu TPU 95A HF",      density: 1.21, nozzleTemp: 220, bedTemp: 50 },
  abs:       { preset: "Bambu ABS",             density: 1.04, nozzleTemp: 270, bedTemp: 100 },
  asa:       { preset: "Bambu ASA",             density: 1.07, nozzleTemp: 270, bedTemp: 100 },
};

function filamentFor(materialKey, densityOverride) {
  const key = String(materialKey || "pla").toLowerCase();
  const base = FILAMENT_MAP[key] || FILAMENT_MAP.pla;
  const density = Number(densityOverride) > 0 ? Number(densityOverride) : base.density;
  return { ...base, density };
}

function processProfileFor(layerHeight) {
  const h = Number(layerHeight) || 0.2;
  if (h <= 0.13) return { file: "process.0.12-fine.json", label: "0.12mm Fine @BBL P1S" };
  if (h <= 0.17) return { file: "process.0.16-optimal.json", label: "0.16mm Optimal @BBL P1S" };
  if (h >= 0.27) return { file: "process.0.28-draft.json", label: "0.28mm Draft @BBL P1S" };
  return { file: "process.0.20-standard.json", label: DEFAULT_PROCESS_LABEL };
}

/* ------------------------------------------------------------------ */
/* G-code result parsing (Bambu + Prusa comment styles)              */
/* ------------------------------------------------------------------ */

function parseDurationToHours(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    // Bare numbers in slicer comments are seconds when > 1000, else hours?
    // Bambu/Prusa always qualify units, so treat bare as seconds.
    return Math.round((raw / 3600) * 100) / 100;
  }
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // HH:MM:SS
  let m = s.match(/(\d+):(\d{1,2}):(\d{1,2})/);
  if (m) {
    const h = (+m[1]) + (+m[2]) / 60 + (+m[3]) / 3600;
    return Math.round(h * 100) / 100;
  }
  // "2h 15m 30s" / "2d 3h" / "135m" / "8100s"
  m = s.match(/(?:(\d+(?:\.\d+)?)\s*d)?\s*(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+(?:\.\d+)?)\s*m(?!s))?\s*(?:(\d+(?:\.\d+)?)\s*s)?/);
  if (m && (m[1] || m[2] || m[3] || m[4])) {
    const h = (+(m[1] || 0)) * 24 + (+(m[2] || 0)) + (+(m[3] || 0)) / 60 + (+(m[4] || 0)) / 3600;
    if (h > 0) return Math.round(h * 100) / 100;
  }
  const asNum = Number(s.replace(/[^0-9.]/g, ""));
  if (Number.isFinite(asNum) && asNum > 0) {
    // Heuristic: > 500 → seconds, else hours.
    return asNum > 500 ? Math.round((asNum / 3600) * 100) / 100 : Math.round(asNum * 100) / 100;
  }
  return null;
}

function firstNumber(lines, patterns) {
  for (const line of lines) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) {
        const v = Number(m[1]);
        if (Number.isFinite(v) && v >= 0) return v;
      }
    }
  }
  return null;
}

/**
 * Parse Bambu Studio / PrusaSlicer / OrcaSlicer G-code comments.
 * Returns { filamentGrams, printTimeHours, supportGrams|null, raw }.
 * filamentDiameterMm + density let us convert [mm]→[g] when only length is present.
 */
function parseGcodeStats(gcodeText, { density = 1.24, filamentDiameterMm = 1.75 } = {}) {
  const text = String(gcodeText || "");
  const lines = text.split(/\r?\n/).slice(0, 4000).map((l) => l.trim());
  const tail = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith(";")).slice(-400);
  const all = lines.concat(tail);

  const gramPatterns = [
    /filament\s*used\s*\[g\]\s*=\s*([0-9.]+)/i,
    /total\s*filament\s*used\s*\[g\]\s*=?\s*([0-9.]+)/i,
    /filament_used_g\s*=\s*([0-9.]+)/i,
    /filament\s+cost\s*[^0-9]*([0-9.]+)\s*g/i,
  ];
  let filamentGrams = firstNumber(all, gramPatterns);

  if ((filamentGrams === null || filamentGrams === undefined)) {
    const mm = firstNumber(all, [
      /filament\s*used\s*\[mm\]\s*=\s*([0-9.]+)/i,
      /total\s*filament\s*used\s*\[mm\]\s*=?\s*([0-9.]+)/i,
      /filament_used_mm\s*=\s*([0-9.]+)/i,
      /filament\s*length\s*=\s*([0-9.]+)\s*mm/i,
    ]);
    if (mm !== null) {
      const areaMm2 = Math.PI * Math.pow(filamentDiameterMm / 2, 2);
      filamentGrams = Math.round(mm * areaMm2 * (density / 1000) * 100) / 100;
    }
  }

  // Supports are rarely split out; catch it when the slicer reports it.
  const supportGrams = firstNumber(all, [
    /support\s*filament\s*used\s*\[g\]\s*=\s*([0-9.]+)/i,
    /support_material_used_g\s*=\s*([0-9.]+)/i,
  ]);

  let printTimeHours = null;
  for (const line of all) {
    const m = line.match(/estimated\s*printing\s*time[^(]*\(?[^)]*\)?\s*[:=]\s*(.+)/i)
      || line.match(/print\s*time\s*[:=]\s*(.+)/i)
      || line.match(/estimated\s*time\s*[:=]\s*(.+)/i);
    if (m) {
      const h = parseDurationToHours(m[1].split(";")[0]);
      if (h !== null && h > 0) {
        printTimeHours = h;
        break;
      }
    }
  }
  if (printTimeHours === null) {
    const secs = firstNumber(all, [
      /estimated_printing_time_s\s*=\s*([0-9.]+)/i,
      /print_time_s\s*=\s*([0-9.]+)/i,
    ]);
    if (secs !== null) printTimeHours = Math.round((secs / 3600) * 100) / 100;
  }

  return {
    filamentGrams: filamentGrams !== null ? Math.round(filamentGrams * 100) / 100 : null,
    printTimeHours,
    supportGrams: supportGrams !== null ? Math.round(supportGrams * 100) / 100 : null,
  };
}

/* ------------------------------------------------------------------ */
/* Slicing                                                           */
/* ------------------------------------------------------------------ */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (d) => hash.update(d));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function profilePath(...parts) {
  return path.join(PROFILES_DIR, ...parts);
}

function readTextOrNull(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Build a Prusa-family INI for this quote (Bambu-equivalent defaults). */
function buildPrusaIni({ infillDensity, supports, filament, layerHeight }) {
  const base = readTextOrNull(profilePath("prusa", "base.ini")) || "";
  const h = Number(layerHeight) || 0.2;
  const infill = Math.min(100, Math.max(0, Number(infillDensity ?? 50)));
  const overrides = [
    `layer_height = ${h}`,
    `first_layer_height = ${Math.min(0.3, h + 0.04)}`,
    `fill_density = ${infill}%`,
    `fill_pattern = grid`,
    `top_solid_layers = 5`,
    `bottom_solid_layers = 3`,
    `perimeters = 2`,
    `support_material = ${supports ? 1 : 0}`,
    `support_material_auto = ${supports ? 1 : 0}`,
    `support_material_style = tree`,
    `filament_diameter = 1.75`,
    `filament_density = ${filament.density}`,
    `nozzle_temperature = ${filament.nozzleTemp}`,
    `bed_temperature = ${filament.bedTemp}`,
  ];
  return `${base}\n# --- Printynozzle quote overrides (Bambu Studio equivalent) ---\n${overrides.join("\n")}\n`;
}

function extractGcodeFrom3mf(mfPath) {
  // Bambu --export-3mf writes a ZIP with Metadata/plate_1.gcode inside.
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(mfPath);
    const entry = zip.getEntry("Metadata/plate_1.gcode")
      || zip.getEntries().find((e) => /plate_1\.gcode$/i.test(e.entryName));
    if (entry) return zip.readAsText(entry);
  } catch {
    // adm-zip missing/unreadable → fall through
  }
  return null;
}

async function sliceWithBambu(binary, { inputPath, workDir, infillDensity, supports, filament, layerHeight }) {
  const process = processProfileFor(layerHeight);
  const machineFile = profilePath("bambu", "machine.p1s.json");
  const processFile = profilePath("bambu", process.file);
  const filamentFile = profilePath("bambu", "filament.generic.json");
  const out3mf = path.join(workDir, "out.gcode.3mf");
  const args = [
    "--slice", "1",
    "--load-settings", `${machineFile};${processFile}`,
    "--load-filaments", filamentFile,
    "--export-3mf", out3mf,
    inputPath,
  ];
  // Engine-level overrides keep Bambu numbers exact for infill/supports.
  // Unknown keys are ignored by Bambu; bundled JSONs carry the full profile.
  const { err, stderr } = await runBinary(binary, args, { timeoutMs: 240000 });
  if (err) {
    return { ok: false, error: `Bambu Studio slice failed: ${String(stderr || err.message || err).slice(0, 500)}` };
  }
  if (!fs.existsSync(out3mf)) {
    return { ok: false, error: "Bambu Studio finished without writing sliced 3MF." };
  }
  const gcode = extractGcodeFrom3mf(out3mf);
  if (!gcode) {
    return { ok: false, error: "Sliced 3MF did not contain plate_1.gcode." };
  }
  const stats = parseGcodeStats(gcode, { density: filament.density });
  return { ok: true, stats, engine: "bambu", profile: process.label, out3mf };
}

async function sliceWithPrusaFamily(binary, engine, { inputPath, workDir, infillDensity, supports, filament, layerHeight }) {
  const ini = buildPrusaIni({ infillDensity, supports, filament, layerHeight });
  const iniPath = path.join(workDir, "quote.ini");
  const outGcode = path.join(workDir, "out.gcode");
  fs.writeFileSync(iniPath, ini, "utf8");
  const args = ["--export-gcode", "--load", iniPath, "--output", outGcode, inputPath];
  const { err, stderr } = await runBinary(binary, args, { timeoutMs: 240000 });
  if (err) {
    return { ok: false, error: `${engine} slice failed: ${String(stderr || err.message || err).slice(0, 500)}` };
  }
  if (!fs.existsSync(outGcode)) {
    return { ok: false, error: `${engine} finished without writing G-code.` };
  }
  const gcode = fs.readFileSync(outGcode, "utf8");
  const stats = parseGcodeStats(gcode, { density: filament.density });
  return { ok: true, stats, engine, profile: DEFAULT_PROCESS_LABEL, outGcode };
}

/**
 * Slice a model file with the free Bambu CLI (or Prusa-family fallback) and
 * return EXACT filament + time numbers.
 *
 * Input: { inputPath, material ('pla'|slug), density?, infillDensity (10-100),
 *          supports (bool), layerHeight? (default 0.2) }
 * Output: { ok, available, engine, filamentGrams, printTimeHours, supportGrams,
 *           profile, printer, cached, error? }
 * Never throws for a missing binary — returns { ok:false, available:false }.
 */
async function sliceModel({ inputPath, material = "pla", density, infillDensity = 50, supports = true, layerHeight = 0.2 } = {}) {
  const status = await getSlicerStatus();
  if (!status.available) {
    return { ok: false, available: false, engine: null, error: status.message };
  }
  if (!inputPath || !fs.existsSync(inputPath)) {
    return { ok: false, available: true, engine: status.engine, error: "Model file not found for slicing." };
  }
  const filament = filamentFor(material, density);
  const infill = Math.min(100, Math.max(0, Number(infillDensity ?? 50)));
  const useSupports = supports !== false && supports !== "false" && supports !== 0;

  // Cache: same file bytes + same settings → same Bambu result.
  let cacheKey = null;
  try {
    ensureDir(CACHE_DIR);
    const hash = await sha256File(inputPath);
    cacheKey = `${hash}.${String(material).toLowerCase()}.${infill}.${useSupports ? 1 : 0}.${Number(layerHeight) || 0.2}.json`;
    const hit = path.join(CACHE_DIR, cacheKey);
    if (fs.existsSync(hit)) {
      const cached = JSON.parse(fs.readFileSync(hit, "utf8"));
      return { ...cached, cached: true, available: true };
    }
  } catch {
    cacheKey = null;
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "printy-slice-"));
  try {
    let result;
    if (status.engine === "bambu") {
      result = await sliceWithBambu(status.binary, { inputPath, workDir, infillDensity: infill, supports: useSupports, filament, layerHeight });
    } else {
      result = await sliceWithPrusaFamily(status.binary, status.engine, { inputPath, workDir, infillDensity: infill, supports: useSupports, filament, layerHeight });
    }
    if (!result.ok) {
      return { ok: false, available: true, engine: status.engine, error: result.error };
    }
    const out = {
      ok: true,
      available: true,
      engine: result.engine,
      filamentGrams: result.stats.filamentGrams,
      printTimeHours: result.stats.printTimeHours,
      supportGrams: result.stats.supportGrams,
      profile: result.profile,
      printer: BAMBU_PRINTER_LABEL,
      cached: false,
    };
    if (out.filamentGrams === null || out.printTimeHours === null) {
      out.ok = false;
      out.error = "Slicer finished but reported no filament/time data.";
    }
    if (out.ok && cacheKey) {
      try {
        fs.writeFileSync(path.join(CACHE_DIR, cacheKey), JSON.stringify(out), "utf8");
      } catch { /* cache is best-effort */ }
    }
    return out;
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

module.exports = {
  getSlicerStatus,
  sliceModel,
  parseGcodeStats,
  parseDurationToHours,
  filamentFor,
  processProfileFor,
  FILAMENT_MAP,
  BAMBU_PRINTER_LABEL,
  DEFAULT_PROCESS_LABEL,
  PROFILES_DIR,
};
