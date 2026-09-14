const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Transactional mailer (payment/order confirmations).
 *
 * Configure via env:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true for 465),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (defaults to SMTP_USER),
 *   SUPPORT_EMAIL / support email fallback for the From name.
 *
 * If SMTP is not configured the helpers log + skip instead of throwing,
 * so checkout never breaks on a dev machine without mail credentials.
 */

let transporter = null;

const isMailerConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!isMailerConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Payment confirmation email. Fire-and-forget — never throws.
 * Returns { sent: boolean, skipped?: string }.
 */
const sendPaymentConfirmationMail = async ({ to, name, order, items = [] }) => {
  try {
    if (!to) return { sent: false, skipped: "no-recipient" };
    const tx = getTransporter();
    if (!tx) {
      console.log(
        `📧 [mailer skipped — SMTP not configured] payment confirmation for order ${order?.order_number} to ${to}`
      );
      return { sent: false, skipped: "smtp-not-configured" };
    }

    const from =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      "PrintyNozzle <no-reply@printynozzle.in>";
    const firstName = escapeHtml((name || "").split(" ")[0] || "Maker");
    const orderNumber = escapeHtml(order?.order_number || "");
    const total = money(order?.total_amount);
    const paymentLabel = escapeHtml(order?.payment_method_label || "Online Payment (Razorpay)");
    const addressBits = [
      order?.shipping_address1,
      order?.shipping_address2,
      order?.shipping_city,
      order?.shipping_state,
      order?.shipping_pincode,
    ]
      .filter(Boolean)
      .map(escapeHtml)
      .join(", ");

    const itemRows = (items || [])
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;">${escapeHtml(
            it.product_name || it.file_name || "Item"
          )}${it.variant_value ? `<br><span style="color:#64748b;font-size:12px;">${escapeHtml(it.variant_value)}</span>` : ""}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:center;">${Number(it.quantity || 1)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;text-align:right;">${money(it.total || it.price)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;">
        <div style="background:linear-gradient(135deg,#0759d6,#3f9bff);padding:26px;border-radius:14px 14px 0 0;text-align:center;">
          <div style="font-size:44px;line-height:1;">✅</div>
          <h1 style="color:#fff;margin:10px 0 4px;font-size:22px;">Payment Successful!</h1>
          <p style="color:#dbeafe;margin:0;font-size:14px;">Order #${orderNumber} is confirmed</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:24px;background:#fff;">
          <p style="font-size:15px;">Hi ${firstName},</p>
          <p style="font-size:14px;color:#334155;">Thank you for shopping with <strong>PrintyNozzle</strong>! Your payment of <strong>${total}</strong> via ${paymentLabel} was successful and your order is now being prepared.</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
            <thead><tr style="background:#f1f5f9;text-align:left;">
              <th style="padding:10px 12px;">Item</th>
              <th style="padding:10px 12px;text-align:center;">Qty</th>
              <th style="padding:10px 12px;text-align:right;">Total</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <table style="width:100%;font-size:14px;margin-bottom:16px;">
            <tr><td style="color:#64748b;">Subtotal</td><td style="text-align:right;">${money(order?.subtotal)}</td></tr>
            <tr><td style="color:#64748b;">Discount</td><td style="text-align:right;">− ${money(order?.discount)}</td></tr>
            <tr><td style="color:#64748b;">GST</td><td style="text-align:right;">${money(order?.tax_amount)}</td></tr>
            <tr><td style="color:#64748b;">Shipping</td><td style="text-align:right;">${Number(order?.shipping_cost || 0) === 0 ? "FREE" : money(order?.shipping_cost)}</td></tr>
            <tr><td style="font-weight:bold;padding-top:8px;border-top:1px solid #e2e8f0;">Grand Total (paid)</td><td style="text-align:right;font-weight:bold;padding-top:8px;border-top:1px solid #e2e8f0;">${total}</td></tr>
          </table>
          ${addressBits ? `<p style="font-size:13px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;">📦 <strong>Delivering to:</strong> ${addressBits}</p>` : ""}
          <p style="font-size:13px;color:#64748b;">Track your order anytime under <strong>My Orders</strong>. Reply to this email if you need help.</p>
          <p style="font-size:13px;color:#64748b;">— Team PrintyNozzle</p>
        </div>
      </div>`;

    await tx.sendMail({
      from,
      to,
      subject: `Payment successful — Order #${order?.order_number} confirmed (${total})`,
      html,
    });
    console.log(`📧 Payment confirmation sent for order ${order?.order_number} to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error("📧 Payment confirmation email failed:", error.message);
    return { sent: false, skipped: error.message };
  }
};

module.exports = { isMailerConfigured, sendPaymentConfirmationMail };
