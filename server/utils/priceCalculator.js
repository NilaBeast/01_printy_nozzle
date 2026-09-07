/**
 * 3D Print Price Calculator
 * 
 * Price Breakdown:
 * - Material Cost = estimated_weight (grams) × price_per_gram
 * - Infill Multiplier: adjusts weight based on infill density
 * - Color Cost = color price_adjustment (usually 0)
 * - Finish Cost = smooth finish adds extra per gram
 * - Total per unit = (material_cost + color_cost + finish_cost)
 * - Subtotal = total_per_unit × quantity
 * - Tax = subtotal × GST rate
 * - Grand Total = subtotal + tax
 */

const calculatePrintPrice = ({
  estimatedWeight,    // grams (estimated from file or user input)
  pricePerGram,       // material price per gram
  infillDensity,      // 10, 20, 30, 50, 100
  surfaceFinish,      // 'standard' or 'smooth'
  smoothFinishPerGram, // extra cost per gram for smooth
  colorAdjustment,    // extra cost for color (usually 0)
  quantity,           // number of copies
  gstRate,            // GST percentage (e.g. 18)
}) => {
  // Infill multiplier — affects effective weight
  const infillMultipliers = {
    10: 0.4,
    20: 0.55,
    30: 0.7,
    50: 1.0,
    100: 1.5,
  };

  const infillMultiplier = infillMultipliers[infillDensity] || 1.0;
  const effectiveWeight = estimatedWeight * infillMultiplier;

  // Material cost
  const materialCost = Math.round(effectiveWeight * pricePerGram * 100) / 100;

  // Color cost
  const colorCost = Math.round((colorAdjustment || 0) * 100) / 100;

  // Finish cost
  let finishCost = 0;
  if (surfaceFinish === "smooth") {
    finishCost = Math.round(effectiveWeight * (smoothFinishPerGram || 3) * 100) / 100;
  }

  // Per unit total
  const perUnitCost = materialCost + colorCost + finishCost;

  // Subtotal
  const subtotal = Math.round(perUnitCost * quantity * 100) / 100;

  // Tax
  const taxAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;

  // Grand total
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    effectiveWeight: Math.round(effectiveWeight * 100) / 100,
    materialCost,
    colorCost,
    finishCost,
    perUnitCost: Math.round(perUnitCost * 100) / 100,
    subtotal,
    taxAmount,
    totalAmount,
    quantity,
    infillDensity,
    surfaceFinish,
  };
};

module.exports = { calculatePrintPrice };
