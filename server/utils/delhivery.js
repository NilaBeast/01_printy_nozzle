require("dotenv").config();

/**
 * Minimal Delhivery Express client (no extra dependencies — uses global fetch).
 *
 * Configuration (server/.env):
 *   DELHIVERY_ENV=staging|production        (default staging)
 *   DELHIVERY_API_TOKEN=<token>             (required to enable live calls)
 *   DELHIVERY_STAGING_BASE_URL=...          (optional override)
 *   DELHIVERY_PRODUCTION_BASE_URL=...       (optional override)
 *
 * When no token is configured every method throws a DelhiveryDisabledError
 * so callers can fall back gracefully (local pincode table, manual flow).
 * Nothing in the order pipeline may crash because Delhivery is unconfigured.
 */

const STAGING_DEFAULT = "https://staging-express.delhivery.com";
const PRODUCTION_DEFAULT = "https://track.delhivery.com";

class DelhiveryDisabledError extends Error {
  constructor(message = "Delhivery is not configured (missing DELHIVERY_API_TOKEN)") {
    super(message);
    this.name = "DelhiveryDisabledError";
    this.code = "DELHIVERY_DISABLED";
  }
}

class DelhiveryApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "DelhiveryApiError";
    this.code = "DELHIVERY_API_ERROR";
    this.status = status;
    this.payload = payload;
  }
}

const getConfig = () => {
  const env = String(process.env.DELHIVERY_ENV || "staging").toLowerCase() === "production"
    ? "production"
    : "staging";
  const baseUrl = (
    env === "production"
      ? process.env.DELHIVERY_PRODUCTION_BASE_URL || PRODUCTION_DEFAULT
      : process.env.DELHIVERY_STAGING_BASE_URL || STAGING_DEFAULT
  ).replace(/\/$/, "");
  const token = (process.env.DELHIVERY_API_TOKEN || "").trim();
  return { env, baseUrl, token, enabled: Boolean(token) };
};

const requireEnabled = () => {
  const cfg = getConfig();
  if (!cfg.enabled) throw new DelhiveryDisabledError();
  return cfg;
};

const withTimeout = (ms = 20000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
};

const authHeaders = (token, extra = {}) => ({
  "Content-Type": "application/json",
  Authorization: `Token ${token}`,
  ...extra,
});

const parseJsonSafe = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text.slice(0, 2000) };
  }
};

const requestJson = async (path, { method = "GET", body = null, form = null, timeoutMs = 20000 } = {}) => {
  const { baseUrl, token } = requireEnabled();
  const { signal, done } = withTimeout(timeoutMs);
  try {
    const headers = { Authorization: `Token ${token}` };
    let payload = null;
    if (form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      payload = new URLSearchParams(form).toString();
    } else {
      headers["Content-Type"] = "application/json";
      payload = body == null ? null : typeof body === "string" ? body : JSON.stringify(body);
    }
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: payload, signal });
    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const msg =
        (data && (data.message || data.error || data.remark || data.remarks)) ||
        `Delhivery API responded with HTTP ${res.status}`;
      throw new DelhiveryApiError(String(msg).slice(0, 500), res.status, data);
    }
    return data;
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new DelhiveryApiError("Delhivery API request timed out", 0, null);
    }
    throw e;
  } finally {
    done();
  }
};

/* ===================== 1. PINCODE SERVICEABILITY ===================== */
const checkPincode = async (pincode) => {
  const pin = String(pincode || "").trim();
  if (!/^\d{6}$/.test(pin)) {
    const err = new Error("Please enter a valid 6-digit Indian PIN code");
    err.code = "INVALID_PINCODE";
    throw err;
  }
  const data = await requestJson(`/c/api/pin-codes/json/?filter_codes=${pin}`);
  const codes = (data && (data.delivery_codes || data.deliveryCodes || [])) || [];
  const entry = codes.find((c) => String(c?.postal_code?.pin || c?.pin || "") === pin) || codes[0] || null;
  if (!entry) {
    return { pin, serviceable: false, cod: false, prepaid: false, city: null, state: null, raw: data };
  }
  const pc = entry.postal_code || entry;
  const flag = (v) => String(v || "").toUpperCase() === "Y";
  return {
    pin,
    serviceable: true,
    cod: flag(pc.cod ?? pc.is_cod ?? entry.cod),
    prepaid: flag(pc.prepaid ?? pc.is_prepaid ?? entry.prepaid ?? "Y"),
    city: pc.city || pc.destination_city || null,
    state: pc.state || pc.destination_state || null,
    raw: entry,
  };
};

/* ===================== 2. FETCH WAYBILL(S) ===================== */
const fetchWaybills = async (count = 1) => {
  const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), 100);
  const data = await requestJson(`/waybill/api/bulk/json/?count=${String(n).padStart(2, "0")}`);
  const list = Array.isArray(data) ? data : data?.waybills || data?.data || data?.wbns || [];
  const bills = (Array.isArray(list) ? list : [list])
    .map((w) => String(w?.waybill || w?.awb || w || "").trim())
    .filter(Boolean);
  if (!bills.length) throw new DelhiveryApiError("Delhivery returned no waybills", 200, data);
  return bills;
};

/* ===================== 3. SHIPPING CHARGES ===================== */
const getCharges = async ({ d_pin, o_pin, weight_g, cod_amount = 0, mode = "S" } = {}) => {
  if (!/^\d{6}$/.test(String(d_pin || ""))) {
    const err = new Error("Destination pincode (d_pin) must be a 6-digit PIN code");
    err.code = "INVALID_PINCODE";
    throw err;
  }
  if (!/^\d{6}$/.test(String(o_pin || ""))) {
    const err = new Error("Origin pincode (o_pin) is not configured — set the pickup pincode first");
    err.code = "INVALID_PINCODE";
    throw err;
  }
  const cgm = Math.max(parseInt(weight_g, 10) || 0, 1);
  const params = new URLSearchParams({
    md: mode || "S",
    ss: "Delivered",
    d_pin: String(d_pin),
    o_pin: String(o_pin),
    cgm: String(cgm),
    pt: "Pre-paid",
    cod: String(Number(cod_amount || 0)),
  });
  const data = await requestJson(`/api/kinko/v1/invoice/charges/.json?${params.toString()}`);
  const row = Array.isArray(data) ? data[0] : data;
  const amount = Number(row?.total_amount ?? row?.total ?? row?.charge ?? row?.gross_amount ?? NaN);
  return {
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
    currency: "INR",
    raw: data,
  };
};

/* ===================== 4. CREATE / UPDATE SHIPMENT (CMU) =====================
 * payload: { pickup_location: "NAME", shipments: [ { name, add, pin, city, state,
 *   country, phone, order, payment_mode: "Prepaid"|"COD", total_amount, cod_amount?,
 *   products_desc?, order_date?, seller_add?, return_*?... , waybill? } ] }
 */
const createShipment = async ({ pickup_location, shipments }) => {
  if (!pickup_location) throw new Error("pickup_location (warehouse name) is required");
  if (!Array.isArray(shipments) || !shipments.length) throw new Error("At least one shipment is required");
  const data = await requestJson("/api/cmu/create.json/", {
    method: "POST",
    form: { format: "json", data: JSON.stringify({ pickup_location, shipments }) },
    timeoutMs: 30000,
  });
  const pkgs = data?.packages || data?.data?.packages || [];
  const ok = data?.success === true || data?.success === "true" || (Array.isArray(pkgs) && pkgs.some((p) => p?.status === true || /success/i.test(String(p?.status || p?.remarks || ""))));
  if (!ok && !pkgs.length) {
    throw new DelhiveryApiError(
      String(data?.message || data?.error || data?.remark || "Delhivery rejected the shipment request").slice(0, 500),
      200,
      data
    );
  }
  return { success: Boolean(ok), packages: pkgs, raw: data };
};

/* ===================== 5. TRACK SHIPMENT ===================== */
const trackShipment = async (waybill) => {
  const wb = String(waybill || "").trim();
  if (!wb) throw new Error("Waybill is required");
  const data = await requestJson(`/api/v1/packages/json/?waybill=${encodeURIComponent(wb)}&ref_ids=`);
  const list = data?.ShipmentData || data?.shipment_data || [];
  const first = Array.isArray(list) ? list[0] : list;
  const ship = first?.Shipment || first || {};
  const statusObj = ship.Status || {};
  return {
    awb: String(ship.AWB || ship.WayBill || wb),
    orderId: ship.OrderID || ship.RefNum || ship.ReferenceNo || null,
    pickupDate: ship.PickUpDate || null,
    status: statusObj.Status || ship.Status || null,
    statusLocation: statusObj.StatusLocation || null,
    statusDateTime: statusObj.StatusDateTime || null,
    instructions: statusObj.Instructions || null,
    scans: Array.isArray(ship.Scans) ? ship.Scans : [],
    raw: ship,
  };
};

/* ===================== 6. SHIPPING LABEL ===================== */
const getLabel = async (waybill, { pdf = true } = {}) => {
  const { baseUrl, token } = requireEnabled();
  const wb = String(waybill || "").trim();
  if (!wb) throw new Error("Waybill is required");
  const { signal, done } = withTimeout(30000);
  try {
    const res = await fetch(
      `${baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(wb)}&pdf=${pdf ? "true" : "false"}`,
      { headers: { Authorization: `Token ${token}` }, signal }
    );
    if (!res.ok) {
      throw new DelhiveryApiError(`Delhivery label request failed (HTTP ${res.status})`, res.status, null);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, contentType: res.headers.get("content-type") || (pdf ? "application/pdf" : "text/html") };
  } catch (e) {
    if (e && e.name === "AbortError") throw new DelhiveryApiError("Delhivery label request timed out", 0, null);
    throw e;
  } finally {
    done();
  }
};

/* ===================== 7. RAISE PICKUP REQUEST ===================== */
const requestPickup = async ({ pickup_location, pickup_date, pickup_time = "11:00", expected_package_count = 1 } = {}) => {
  if (!pickup_location) throw new Error("pickup_location is required");
  const dates = Array.isArray(pickup_date) ? pickup_date : [pickup_date].filter(Boolean);
  const data = await requestJson("/fm/request/new/", {
    method: "POST",
    form: {
      format: "json",
      data: JSON.stringify({
        pickup_location,
        pickup_date: dates.length ? dates : undefined,
        pickup_time,
        expected_package_count,
      }),
    },
    timeoutMs: 30000,
  });
  const requestId =
    data?.pickup_id || data?.pickup_token_number || data?.data?.pickup_id || data?.id || null;
  return { requestId, raw: data };
};

/* ===================== WAREHOUSE (one-time setup) ===================== */
const createWarehouse = async (fields = {}) => {
  const required = ["name", "phone", "address", "city", "pin", "state"];
  for (const k of required) {
    if (!String(fields[k] || "").trim()) throw new Error(`Warehouse field "${k}" is required`);
  }
  const data = await requestJson("/api/backend/clientwarehouse/create/", {
    method: "POST",
    form: {
      name: fields.name,
      phone: fields.phone,
      address: fields.address,
      city: fields.city,
      pin: String(fields.pin),
      state: fields.state,
      country: fields.country || "India",
      ...(fields.email ? { email: fields.email } : {}),
    },
    timeoutMs: 30000,
  });
  return { raw: data };
};

/* ===================== STATUS NORMALIZATION =====================
 * Maps Delhivery's free-text shipment status to a stable key the app can act on.
 */
const normalizeStatus = (rawStatus) => {
  const s = String(rawStatus || "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const has = (...words) => words.some((w) => s.includes(w));
  if (!s) return { key: "UNKNOWN", label: rawStatus || "Unknown" };
  if (has("rto deliver")) return { key: "RTO_DELIVERED", label: rawStatus };
  if (has("rto")) return { key: "RTO", label: rawStatus };
  if (has("deliver") && !has("out for", "out-for")) return { key: "DELIVERED", label: rawStatus };
  if (has("out for delivery")) return { key: "OUT_FOR_DELIVERY", label: rawStatus };
  if (has("cancel")) return { key: "CANCELLED", label: rawStatus };
  if (has("lost", "damage")) return { key: "EXCEPTION", label: rawStatus };
  if (has("pick", "pickup", "picked")) {
    if (has("transit", "dispatch", "shed", "hub", "destination", "reach", "arriv", "linehaul", "connect")) {
      return { key: "IN_TRANSIT", label: rawStatus };
    }
    return { key: "PICKED_UP", label: rawStatus };
  }
  if (has("transit", "dispatch", "shed", "hub", "destination", "reach", "arriv", "linehaul", "connect", "shipped")) {
    return { key: "IN_TRANSIT", label: rawStatus };
  }
  if (has("manifest", "pending", "ready to ship", "ready for pickup", "booked", "created", "scheduled")) {
    return { key: "MANIFESTED", label: rawStatus };
  }
  return { key: "OTHER", label: rawStatus };
};

module.exports = {
  DelhiveryDisabledError,
  DelhiveryApiError,
  getConfig,
  checkPincode,
  fetchWaybills,
  getCharges,
  createShipment,
  trackShipment,
  getLabel,
  requestPickup,
  createWarehouse,
  normalizeStatus,
};
