import { useEffect, useState } from "react";
import catalogService from "../services/catalog.service";

/* Module-level cache so every component shares one /home request */
let cachedSettings = null;
let cachedPromise = null;

const fetchSettings = () => {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (!cachedPromise) {
    cachedPromise = catalogService
      .getHome()
      .then((res) => {
        cachedSettings = res.data?.data?.siteSettings || res.data?.siteSettings || {};
        return cachedSettings;
      })
      .catch(() => {
        cachedPromise = null;
        return {};
      });
  }
  return cachedPromise;
};

/**
 * Live store settings edited in Admin → Settings.
 * Falls back to sensible defaults when the API is unreachable,
 * so the storefront never breaks on a fresh/empty database.
 */
export default function useSiteSettings() {
  const [settings, setSettings] = useState(cachedSettings || {});

  useEffect(() => {
    let active = true;
    fetchSettings().then((data) => {
      if (active) setSettings(data || {});
    });
    return () => {
      active = false;
    };
  }, []);

  const num = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  return {
    settings,
    siteName: settings.site_name || "PrintyNozzle",
    siteTagline: settings.site_tagline || "",
    supportEmail: settings.support_email || "",
    supportPhone: settings.support_phone || "",
    freeShippingThreshold: num(settings.free_shipping_threshold, 999),
    gstRate: num(settings.gst_rate, 18),
  };
}
