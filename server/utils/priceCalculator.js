/**
 * 3D Print Price Calculator — Printynozzle Selling Rate Chart
 *
 * Final price = Material charge + Printing-time charge (+ color/finish, then GST)
 *
 * Weight model mirrors slicer software (Cura / PrusaSlicer / Bambu Studio):
 * every print has a 100%-dense SHELL (walls + top/bottom skins, ~1mm) and
 * only the interior is scaled by the infill percentage:
 *
 *   shellVol    = min(solidVol, surfaceArea × SHELL_MM)
 *   filamentVol = (shellVol + (solidVol − shellVol) × infill/100) × WASTE_FACTOR
 *   effectiveWeight = filamentVol × density
 *
 * - Material charge = effective_weight (grams) × price_per_gram (₹/g, admin editable per material)
 * - solidVol comes from the exact STL mesh volume × density (before infill)
 * - Print time (hours) = effective_weight × hours_per_gram (admin editable, default 0.15)
 * - Printing-time charge = print_time_hours × slab rate (admin editable)
 *
 * Legacy callers without surface-area data fall back to the old whole-volume
 * infill multipliers so old carts/orders keep pricing identically.
 */

const DEFAULT_TIME_RATES = {
  rate_0_5: 50,
  rate_5_10: 45,
  rate_10_20: 40,
  rate_20_plus: 35,
};

const DEFAULT_HOURS_PER_GRAM = 0.15;

/* Slicer-profile constants (must match the storefront estimator):
 * solid shell ≈ 0.4mm-nozzle wall loops + ~0.2mm top/bottom skins
 * (1.0mm at the default 2 walls), 3% extra for skirt/purge/flow losses. */
const SHELL_MM = 1.0;
const WASTE_FACTOR = 1.03;
const BASE_LAYER_HEIGHT_MM = 0.2;

// Wall loops (2|3|4) → solid shell thickness in mm.
const shellMmForWalls = (wallLoops) => {
  const walls = [2, 3, 4].includes(Number(wallLoops)) ? Number(wallLoops) : 2;
  return Math.round((walls * 0.4 + 0.2) * 100) / 100;
};

// Layer height (mm) → print-time factor vs the 0.20mm baseline
// (0.08mm takes ~2.5x longer, 0.28mm ~0.7x). Exact slicer times win when present.
const timeFactorForLayerHeight = (layerHeightMm) => {
  const h = Number(layerHeightMm) > 0 ? Number(layerHeightMm) : BASE_LAYER_HEIGHT_MM;
  return BASE_LAYER_HEIGHT_MM / h;
};

// Whole-volume infill multipliers (legacy fallback only)
const LEGACY_INFILL_MULTIPLIERS = {
  10: 0.4,
  12: 0.43,
  15: 0.47,
  20: 0.55,
  25: 0.62,
  30: 0.7,
  40: 0.85,
  50: 1.0,
  100: 1.5,
};

/* Slicer-style effective (filament) weight in grams. Returns null when the
 * inputs are unusable so callers can fall back to the legacy multipliers. */
const estimateFilamentWeight = ({ solidWeight, density, surfaceAreaCm2, infillDensity, shellMm = SHELL_MM }) => {
  const solid = Number(solidWeight);
  const rho = Number(density);
  const area = Number(surfaceAreaCm2);
  const infill = Number(infillDensity);
  if (!Number.isFinite(solid) || solid <= 0) return null;
  if (!Number.isFinite(rho) || rho <= 0) return null;
  if (!Number.isFinite(area) || area <= 0) return null;
  if (!Number.isFinite(infill) || infill < 0 || infill > 100) return null;
  const shell = Number(shellMm) > 0 ? Number(shellMm) : SHELL_MM;
  const solidVol = solid / rho; // cm³
  const shellVol = Math.min(solidVol, area * (shell / 10)); // cm³
  const interiorVol = Math.max(0, solidVol - shellVol);
  const filamentVol = (shellVol + interiorVol * (infill / 100)) * WASTE_FACTOR;
  return Math.round(filamentVol * rho * 100) / 100;
};

/* Default hourly slabs (admin editable via the Hourly Rates tab).
 * Shape: [{ min: 0, max: 5, rate: 50 }, ..., { min: 20, max: null, rate: 35 }]
 * max: null = no upper limit. Stored as JSON in site_settings.print_time_slabs. */
const DEFAULT_TIME_SLABS = [
  { min: 0, max: 5, rate: 50 },
  { min: 5, max: 10, rate: 45 },
  { min: 10, max: 20, rate: 40 },
  { min: 20, max: null, rate: 35 },
];

const slabLabel = (slab) =>
  slab.max === null || slab.max === undefined ? `${slab.min}+ hours` : `${slab.min}–${slab.max} hours`;

/* Normalize/validate a slabs array (admin input or DB JSON). Returns a clean
 * sorted array, or null when unusable (callers fall back to defaults). */
const parseTimeSlabs = (raw) => {
  let arr = raw;
  if (typeof arr === "string") {
    try {
      arr = JSON.parse(arr);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const clean = [];
  for (const s of arr) {
    const min = Number(s.min ?? s.min_hours);
    const maxRaw = s.max ?? s.max_hours;
    const max = maxRaw === null || maxRaw === undefined || maxRaw === "" ? null : Number(maxRaw);
    const rate = Number(s.rate);
    if (!Number.isFinite(min) || min < 0 || !Number.isFinite(rate) || rate < 0) return null;
    if (max !== null && (!Number.isFinite(max) || max <= min)) return null;
    clean.push({ min, max, rate });
  }
  clean.sort((a, b) => a.min - b.min);
  return clean;
};

/* Legacy 4-key settings ({ rate_0_5, ... }) → slabs array. */
const timeRatesToSlabs = (timeRates = {}) => {
  const merged = { ...DEFAULT_TIME_RATES, ...(timeRates || {}) };
  return [
    { min: 0, max: 5, rate: Number(merged.rate_0_5) },
    { min: 5, max: 10, rate: Number(merged.rate_5_10) },
    { min: 10, max: 20, rate: Number(merged.rate_10_20) },
    { min: 20, max: null, rate: Number(merged.rate_20_plus) },
  ];
};

const resolveSlabs = ({ timeSlabs, timeRates } = {}) => {
  const parsed = parseTimeSlabs(timeSlabs);
  if (parsed) return parsed;
  if (timeRates && Object.keys(timeRates).length > 0) return timeRatesToSlabs(timeRates);
  return DEFAULT_TIME_SLABS.map((s) => ({ ...s }));
};

/* Accept any slab representation and return a clean slabs array:
 * array | { timeSlabs, timeRates } | legacy { rate_0_5, ... } | undefined */
const normalizeSlabsInput = (input) => {
  if (Array.isArray(input)) {
    const parsed = parseTimeSlabs(input);
    if (parsed) return parsed;
  } else if (input && typeof input === "object") {
    if (input.timeSlabs !== undefined || input.timeRates !== undefined) {
      return resolveSlabs(input);
    }
    if (input.rate_0_5 !== undefined) return timeRatesToSlabs(input);
  }
  return DEFAULT_TIME_SLABS.map((s) => ({ ...s }));
};

const getTimeSlab = (hours, slabsOrOpts) => {
  const h = Number(hours || 0);
  const slabs = normalizeSlabsInput(slabsOrOpts);
  const match =
    slabs.find((s) => h > s.min && (s.max === null || s.max === undefined || h <= s.max)) ||
    slabs[slabs.length - 1] ||
    slabs[0];
  const idx = Math.max(0, slabs.indexOf(match));
  return { key: `slab_${idx}`, label: slabLabel(match), min: match.min, max: match.max ?? null };
};

const resolveTimeRate = (hours, slabsOrOpts) => {
  const slab = getTimeSlab(hours, slabsOrOpts);
  const slabs = normalizeSlabsInput(slabsOrOpts);
  const idx = Number(String(slab.key).split("_")[1] || 0);
  return { slab, rate: Number(slabs[idx]?.rate || 0) };
};

const calculatePrintPrice = ({
  estimatedWeight,    // grams (solid weight from STL volume × density, before infill scaling)
  pricePerGram,       // material selling rate ₹/g
  infillDensity,      // 10, 12, 15, 20, 25, 30, 40, 50
  layerHeightMm = 0.2, // 0.08 | 0.12 | 0.16 | 0.20 | 0.28 — scales print time
  wallLoops = 2,       // 2 | 3 | 4 — scales the solid shell
  surfaceFinish,      // 'standard' or 'smooth',
  smoothFinishPerGram, // extra cost per gram for smooth
  colorAdjustment,    // extra cost for color (usually 0)
  quantity,           // number of copies
  gstRate,            // GST percentage (e.g. 18)
  hoursPerGram,       // hours of print time per gram (default 0.15)
  timeRates,          // legacy { rate_0_5, rate_5_10, rate_10_20, rate_20_plus }
  timeSlabs,          // dynamic slabs [{ min, max (null = no limit), rate }] — wins over timeRates
  density,            // material density g/cm³ (enables slicer shell model)
  surfaceAreaCm2,     // mesh surface area cm² (enables slicer shell model)
  supportVolumeCm3,   // Bambu-style support filament volume cm³ (0/undefined = none)
  // --- Free Bambu CLI exact numbers (preferred when present) ---
  slicerFilamentGrams, // exact total filament (model + supports) from Bambu/Prusa G-code
  slicerTimeHours,     // exact print time from Bambu/Prusa G-code
  slicerSupportGrams,  // exact support filament from G-code (null = use supportVolumeCm3 path)
}) => {
  const walls = [2, 3, 4].includes(Number(wallLoops)) ? Number(wallLoops) : 2;
  const layerH = Number(layerHeightMm) > 0 ? Number(layerHeightMm) : BASE_LAYER_HEIGHT_MM;
  const shellMm = shellMmForWalls(walls);
  const layerTimeFactor = timeFactorForLayerHeight(layerH);
  // Slicer-style effective weight when geometry data is present,
  // otherwise the legacy whole-volume infill multiplier.
  // When the free Bambu CLI sliced this exact file+settings, its G-code
  // filament total (model + supports) wins over every heuristic.
  const slicerFilament = Number(slicerFilamentGrams);
  const useSlicerWeight = Number.isFinite(slicerFilament) && slicerFilament > 0;
  const slicerSupport = Number(slicerSupportGrams);
  const useSlicerSupport = Number.isFinite(slicerSupport) && slicerSupport >= 0;
  const infillMultiplier = LEGACY_INFILL_MULTIPLIERS[infillDensity] || 1.0;
  const slicerWeight = estimateFilamentWeight({
    solidWeight: estimatedWeight,
    density,
    surfaceAreaCm2,
    infillDensity,
    shellMm,
  });
  const modelWeight = useSlicerWeight
    ? slicerFilament - (useSlicerSupport ? slicerSupport : 0)
    : slicerWeight !== null ? slicerWeight : estimatedWeight * infillMultiplier;

  // Support structures print in the same material: extra filament weight
  // plus proportional extra print time.
  const rho = Number(density) > 0 ? Number(density) : null;
  const supportVol = Math.max(0, Number(supportVolumeCm3) || 0);
  const supportWeight = useSlicerWeight
    ? (useSlicerSupport ? Math.round(slicerSupport * 100) / 100 : 0)
    : rho !== null && supportVol > 0
      ? Math.round(supportVol * rho * 100) / 100
      : 0;

  const effectiveWeight = useSlicerWeight
    ? Math.round(slicerFilament * 100) / 100
    : Math.round((modelWeight + supportWeight) * 100) / 100;

  // Material charge = effective weight × selling rate (₹/g)
  const materialCost = Math.round(effectiveWeight * pricePerGram * 100) / 100;

  // Estimated print time: exact Bambu G-code time when sliced, else the
  // calibrated weight × hours-per-gram factor scaled by layer height.
  // Weight already embeds STL volume × material density × infill + supports,
  // so time automatically depends on the attached file + selected material.
  const hpg = Number(hoursPerGram) > 0 ? Number(hoursPerGram) : DEFAULT_HOURS_PER_GRAM;
  const slicerTime = Number(slicerTimeHours);
  const useSlicerTime = Number.isFinite(slicerTime) && slicerTime > 0;
  const printTimeHours = useSlicerTime
    ? Math.round(slicerTime * 100) / 100
    : Math.round(effectiveWeight * hpg * layerTimeFactor * 100) / 100;

  // Printing-time charge = time × slab rate from the rate chart
  const { slab, rate: timeRate } = resolveTimeRate(printTimeHours, { timeSlabs, timeRates });
  const timeCost = Math.round(printTimeHours * timeRate * 100) / 100;

  // Support split (same filament + same time rate, shown separately)
  const supportCost = Math.round(supportWeight * pricePerGram * 100) / 100;
  const supportTimeHours = useSlicerTime
    ? Math.round(supportWeight * hpg * 100) / 100
    : Math.round(supportWeight * hpg * layerTimeFactor * 100) / 100;
  const supportTimeCost = Math.round(supportTimeHours * timeRate * 100) / 100;

  // Color cost
  const colorCost = Math.round((colorAdjustment || 0) * 100) / 100;

  // Finish cost
  let finishCost = 0;
  if (surfaceFinish === "smooth") {
    finishCost = Math.round(effectiveWeight * (smoothFinishPerGram || 3) * 100) / 100;
  }

  // Per unit total — Final price = Material charge + Printing-time charge (+ extras)
  const perUnitCost = Math.round((materialCost + timeCost + colorCost + finishCost) * 100) / 100;

  // Subtotal
  const subtotal = Math.round(perUnitCost * quantity * 100) / 100;

  // Tax
  const taxAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;

  // Grand total
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    effectiveWeight: Math.round(effectiveWeight * 100) / 100,
    modelWeight: Math.round(modelWeight * 100) / 100,
    supportWeight,
    supportVolumeCm3: supportVol,
    supportCost,
    supportTimeHours,
    supportTimeCost,
    materialCost,
    printTimeHours,
    timeRate,
    timeRateLabel: slab.label,
    timeCost,
    colorCost,
    finishCost,
    perUnitCost,
    subtotal,
    taxAmount,
    totalAmount,
    quantity,
    infillDensity,
    layerHeightMm: layerH,
    wallLoops: walls,
    layerTimeFactor: Math.round(layerTimeFactor * 100) / 100,
    shellMm,
    surfaceFinish,
    hoursPerGram: hpg,
    // Provenance: 'bambu' when the free Bambu CLI sliced the exact file.
    pricingSource: useSlicerWeight && useSlicerTime ? "bambu" : useSlicerWeight ? "bambu-weight" : "estimate",
    slicerFilamentGrams: useSlicerWeight ? Math.round(slicerFilament * 100) / 100 : null,
    slicerTimeHours: useSlicerTime ? Math.round(slicerTime * 100) / 100 : null,
  };
};

/**
 * Price directly from Bambu CLI slicer numbers (exact Bambu Studio weight +
 * time) plus the store's material/time/finish/GST rates. Thin wrapper over
 * calculatePrintPrice for the slice-quote path.
 */
const calculatePrintPriceFromSlicer = ({
  filamentGrams,
  printTimeHours,
  supportGrams = null,
  pricePerGram,
  surfaceFinish = "standard",
  smoothFinishPerGram,
  colorAdjustment = 0,
  quantity = 1,
  gstRate,
  timeSlabs,
  timeRates,
  infillDensity = 50,
}) => calculatePrintPrice({
  estimatedWeight: Math.max(2, Number(filamentGrams) || 0),
  pricePerGram,
  infillDensity,
  surfaceFinish,
  smoothFinishPerGram,
  colorAdjustment,
  quantity,
  gstRate,
  density: 1.24,
  surfaceAreaCm2: null, // force slicer path, not the shell heuristic
  supportVolumeCm3: 0,
  slicerFilamentGrams: filamentGrams,
  slicerTimeHours: printTimeHours,
  slicerSupportGrams: supportGrams,
  timeSlabs,
  timeRates,
});

module.exports = { calculatePrintPrice, calculatePrintPriceFromSlicer, getTimeSlab, resolveTimeRate, parseTimeSlabs, timeRatesToSlabs, resolveSlabs, estimateFilamentWeight, shellMmForWalls, timeFactorForLayerHeight, SHELL_MM, WASTE_FACTOR, BASE_LAYER_HEIGHT_MM, DEFAULT_TIME_RATES, DEFAULT_TIME_SLABS, DEFAULT_HOURS_PER_GRAM };
