require("dotenv").config();
const { findOrderByAwb, applyTrackingStatus } = require("../utils/shippingSync");

/**
 * POST /api/webhooks/delhivery
 *
 * Receives Delhivery shipment status pushes and applies them through the
 * SAME applier the poll-sync uses (advance-only, history recorded).
 *
 * Verification: if DELHIVERY_WEBHOOK_SECRET is set in env, the caller must
 * present it as `?secret=…`, header `x-webhook-secret`, or body `secret`.
 * When no secret is configured (typical staging) any well-formed push is
 * accepted — AWB matching + advance-only guards still prevent damage.
 *
 * Always answers 200 quickly; processing happens after the response so
 * Delhivery never retries storms us.
 */

const extractShipments = (body) => {
  if (!body || typeof body !== "object") return [];
  const candidates = [];
  if (Array.isArray(body)) candidates.push(...body);
  if (body.Shipment) candidates.push(...(Array.isArray(body.Shipment) ? body.Shipment : [body.Shipment]));
  if (body.Shipments) candidates.push(...(Array.isArray(body.Shipments) ? body.Shipments : [body.Shipments]));
  if (body.shipment) candidates.push(...(Array.isArray(body.shipment) ? body.shipment : [body.shipment]));
  if (body.shipments) candidates.push(...(Array.isArray(body.shipments) ? body.shipments : [body.shipments]));
  if (!candidates.length && (body.AWB || body.WayBill || body.waybill || body.awb)) candidates.push(body);
  return candidates.filter(Boolean);
};

const toTracking = (s) => {
  const st = s.Status ?? s.status ?? null;
  const obj = st && typeof st === "object" ? st : {};
  return {
    status: obj.Status || (typeof st === "string" ? st : null) || s.StatusCode || null,
    statusLocation: obj.StatusLocation || s.StatusLocation || s.location || null,
    statusDateTime: obj.StatusDateTime || s.StatusDateTime || s.status_date_time || null,
    instructions: obj.Instructions || s.Instructions || null,
    scans: Array.isArray(s.Scans) ? s.Scans : [],
  };
};

const delhiveryWebhook = async (req, res) => {
  try {
    const secret = String(process.env.DELHIVERY_WEBHOOK_SECRET || "").trim();
    if (secret) {
      const presented = String(
        req.query.secret || req.headers["x-webhook-secret"] || req.body?.secret || ""
      ).trim();
      if (presented !== secret) {
        return res.status(401).json({ success: false, message: "Invalid webhook secret" });
      }
    }

    const shipments = extractShipments(req.body);
    // Acknowledge immediately — Delhivery retries on slow/5xx responses.
    res.status(200).json({ success: true, received: shipments.length });

    setImmediate(async () => {
      for (const s of shipments) {
        try {
          const awb = String(s.AWB || s.WayBill || s.waybill || s.awb || "").trim();
          if (!awb) continue;
          const found = await findOrderByAwb(awb);
          if (!found) {
            console.warn(`Delhivery webhook: no local order for AWB ${awb}`);
            continue;
          }
          const tracking = toTracking(s);
          if (!tracking.status) continue;
          const result = await applyTrackingStatus(found.type, found.order, tracking);
          console.log(`🔄 Webhook ${awb} → ${result.status} (${found.type} #${found.order.id})`);
        } catch (e) {
          console.error("Delhivery webhook item failed:", e.message);
        }
      }
    });
  } catch (error) {
    console.error("Delhivery webhook error:", error);
    // Still ack — a malformed push must not trigger retry storms.
    if (!res.headersSent) return res.status(200).json({ success: true, received: 0 });
  }
};

module.exports = { delhiveryWebhook };
