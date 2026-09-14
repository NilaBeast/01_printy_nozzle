/**
 * Coupon pricing helper — single source of truth.
 *
 * Requirement: coupon discount must be calculated on the FULL price
 * including GST (subtotal + GST), not on the pre-tax subtotal.
 *
 *   tax      = subtotal * gstRate / 100
 *   full     = subtotal + tax
 *   discount = percentage ? full * value/100 (capped by max_discount)
 *            : fixed value
 *   discount = min(discount, full)  (never exceed payable amount)
 *   total    = full - discount        (shipping added separately)
 */

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

const calculateCouponTotals = ({ subtotal = 0, gstRate = 18, coupon = null }) => {
  const safeSubtotal = round2(subtotal);
  const safeRate = Number(gstRate || 0);
  const taxAmount = round2((safeSubtotal * safeRate) / 100);
  const fullAmount = round2(safeSubtotal + taxAmount);

  let discount = 0;
  if (coupon && safeSubtotal >= Number(coupon.min_order_amount || 0)) {
    if (coupon.discount_type === "percentage") {
      discount = (fullAmount * Number(coupon.discount_value || 0)) / 100;
      if (coupon.max_discount != null && coupon.max_discount !== "") {
        const cap = Number(coupon.max_discount);
        if (Number.isFinite(cap) && discount > cap) discount = cap;
      }
    } else {
      discount = Number(coupon.discount_value || 0);
    }
    // Never discount more than the payable (full) amount
    if (discount > fullAmount) discount = fullAmount;
    if (discount < 0) discount = 0;
  }

  discount = round2(discount);
  const totalAmount = round2(Math.max(0, fullAmount - discount));

  return { subtotal: safeSubtotal, taxAmount, fullAmount, discount, totalAmount };
};

module.exports = { calculateCouponTotals, round2 };
