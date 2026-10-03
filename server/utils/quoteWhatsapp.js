/**
 * WhatsApp quote link builder (no DB dependency — safe to unit test).
 *
 * Guests request a 3D-print quote from the storefront; the details plus the
 * uploaded model link are sent to the store's WhatsApp number via a
 * wa.me deep link. WhatsApp links are text-only, so the model FILE itself
 * travels as its hosted URL (uploaded to Cloudinary before this runs).
 */

// Store WhatsApp number in international format without "+" or spaces.
// Default: +91 98366 09063 → 919836609063. Override via env.
const WHATSAPP_NUMBER = String(
  process.env.PRINT_QUOTE_WHATSAPP || "919836609063"
).replace(/\D/g, "");

const WHATSAPP_DISPLAY = "+91 98366 09063";

const line = (v) => String(v ?? "").trim();

function buildQuoteMessage(q = {}) {
  const dims = [q.dimension_x, q.dimension_y, q.dimension_z]
    .map((d) => (d === null || d === undefined || d === "" ? null : Number(d)))
    .every((d) => d === null)
    ? ""
    : [q.dimension_x, q.dimension_y, q.dimension_z]
        .map((d) => (d === null || d === undefined || d === "" ? "—" : d))
        .join(" x ") + " mm";
  const color = line(q.color_name) || (line(q.custom_color_hex) ? `Custom (${q.custom_color_hex})` : "—");
  const rows = [
    "New 3D Print Quote Request (Printynozzle)",
    `Quotation ID: ${q.id ?? "—"}`,
    `Name: ${line(q.customer_name) || "—"}`,
    `Phone: ${line(q.customer_phone) || "—"}`,
    `Email: ${line(q.customer_email) || "—"}`,
    `Address: ${line(q.customer_address) || "—"}`,
    `File: ${line(q.file_name) || "model"}`,
    dims ? `Dimensions: ${dims}` : null,
    q.file_size ? `File size: ${q.file_size} MB` : null,
    `Material: ${line(q.material_name) || "—"}`,
    `Color: ${color}`,
    `Qty: ${Number(q.quantity) || 1}`,
    q.file_url ? `Model link: ${line(q.file_url)}` : null,
  ].filter((r) => r !== null);
  return rows.join("\n");
}

function buildWhatsAppUrl(message, number = WHATSAPP_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

module.exports = { WHATSAPP_NUMBER, WHATSAPP_DISPLAY, buildQuoteMessage, buildWhatsAppUrl };
