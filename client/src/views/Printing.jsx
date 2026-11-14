import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  UploadCloud,
  Trash2,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Headphones,
  Box,
  Layers,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  MessageCircle,
  X,
} from "lucide-react";
import defaultPricingData from "../data/materialPrices.json";
import { QRCodeSVG } from "qrcode.react";
import ModelViewer3D, {
  SUPPORTED_MODEL_ACCEPT,
  SUPPORTED_MODEL_EXTS,
} from "../components/ModelViewer3D";
import printingService from "../services/printing.service";
import catalogService from "../services/catalog.service";
import {
  MAX_PRINT_WIDTH_MM,
  MAX_PRINT_DEPTH_MM,
  MAX_PRINT_HEIGHT_MM,
  MAX_FILE_SIZE_MB,
} from "../config";
import "../../public/css/printing.css";

const WHATSAPP_DISPLAY_NUMBER = "+91 98366 09063";

const blankQuoteForm = () => ({
  name: "",
  phone: "",
  email: "",
  country: "India",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pincode: "",
});

const formatRupees = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Printing() {
  const fileInputRef = useRef(null);
  const optionsSectionRef = useRef(null);

  /* =========================================================
     MATERIALS / COLORS / DELIVERY INFO (no pricing anymore)
     ========================================================= */
  const [serverMaterials, setServerMaterials] = useState(null);
  const [serverColors, setServerColors] = useState(null);
  const [serverSiteSettings, setServerSiteSettings] = useState(null);
  const defaultPricingConfig = defaultPricingData;

  const deliveryDays =
    serverSiteSettings?.estimatedDeliveryDays ??
    defaultPricingConfig.siteSettings?.estimatedDeliveryDays ??
    "3 – 5 Working Days";
  const deliveryRegion =
    serverSiteSettings?.deliveryRegion ??
    defaultPricingConfig.siteSettings?.deliveryRegion ??
    "Across India";

  /* =========================================================
     3D MODEL STATE
     ========================================================= */
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [useSample, setUseSample] = useState(true);
  const [modelThumb, setModelThumb] = useState(null);
  const [modelAnalysis, setModelAnalysis] = useState({
    fileName: "rocket.stl",
    fileSizeMB: 2.45,
    dimensions: { x: 80, y: 80, z: 150 },
    volumeCm3: 16.1,
    weightGrams: 20,
  });

  const handleModelAnalysis = useCallback((stats) => {
    setModelAnalysis(stats);
  }, []);

  // Validation: Check if model dimensions exceed printable limits (-1 = no limit)
  const isWidthExceeded =
    MAX_PRINT_WIDTH_MM !== -1 &&
    !isNaN(MAX_PRINT_WIDTH_MM) &&
    (modelAnalysis?.dimensions?.x || 0) > MAX_PRINT_WIDTH_MM;

  const isDepthExceeded =
    MAX_PRINT_DEPTH_MM !== -1 &&
    !isNaN(MAX_PRINT_DEPTH_MM) &&
    (modelAnalysis?.dimensions?.y || 0) > MAX_PRINT_DEPTH_MM;

  const isHeightExceeded =
    MAX_PRINT_HEIGHT_MM !== -1 &&
    !isNaN(MAX_PRINT_HEIGHT_MM) &&
    (modelAnalysis?.dimensions?.z || 0) > MAX_PRINT_HEIGHT_MM;

  const isOversized = isWidthExceeded || isDepthExceeded || isHeightExceeded;

  /* =========================================================
     PRINT OPTIONS STATE (material / color / quantity only)
     ========================================================= */
  const materials = serverMaterials !== null ? serverMaterials : (defaultPricingConfig.materials || []);
  const colors = serverColors !== null ? serverColors : (defaultPricingConfig.colors || []);

  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id || "pla");
  const [selectedColorHex, setSelectedColorHex] = useState("#1E88E5");
  const [customHexInput, setCustomHexInput] = useState("");
  const [quantity, setQuantity] = useState(1);

  /* =========================================================
     WHATSAPP QUOTE MODAL STATE
     ========================================================= */
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState(blankQuoteForm);
  const [sendingQuote, setSendingQuote] = useState(false);
  // 'whatsapp' → opens WhatsApp after submit; 'qr' → opens the QR payment modal.
  const [quoteModalMode, setQuoteModalMode] = useState("whatsapp");

  /* =========================================================
     QR PAYMENT MODAL STATE
     ========================================================= */
  const [isQrPaymentOpen, setIsQrPaymentOpen] = useState(false);
  const [qrScreenshot, setQrScreenshot] = useState(null);
  const [qrPreview, setQrPreview] = useState("");
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrConfig, setQrConfig] = useState({ upi_id: "", payee_name: "Printynozzle", image_url: "" });
  // Price breakdown fetched from the server for the QR payment modal.
  const [qrPricing, setQrPricing] = useState(null);
  const [qrPricingLoading, setQrPricingLoading] = useState(false);
  const [qrPricingError, setQrPricingError] = useState(false);
  const [modelPricing, setModelPricing] = useState(null);
  const [modelPricingLoading, setModelPricingLoading] = useState(false);
  const [modelPricingError, setModelPricingError] = useState(false);

  // Dynamic UPI QR — scan opens any UPI app with payee + exact total pre-filled.
  const qrGrandTotal = qrPricing?.totalAmount || 0;
  const upiPayUrl = useMemo(() => {
    const pa = String(qrConfig.upi_id || "").trim();
    if (!pa || !(Number(qrGrandTotal) > 0)) return "";
    const params = [
      `pa=${encodeURIComponent(pa)}`,
      `pn=${encodeURIComponent(String(qrConfig.payee_name || "Printynozzle").trim() || "Printynozzle")}`,
      `am=${Number(qrGrandTotal).toFixed(2)}`,
      "cu=INR",
      `tn=${encodeURIComponent("Printynozzle 3D Print order payment")}`,
    ];
    return `upi://pay?${params.join("&")}`;
  }, [qrConfig.upi_id, qrConfig.payee_name, qrGrandTotal]);

  useEffect(() => {
    let active = true;

    const loadPrintingOptions = async () => {
      try {
        const [materialsResponse, colorsResponse, configResponse] = await Promise.all([
          printingService.getMaterials(),
          printingService.getColors(),
          catalogService.getPrintingConfig(),
        ]);

        if (!active) return;

        const serverConfig = configResponse.data.settings || {};
        setServerSiteSettings({
          estimatedDeliveryDays: serverConfig.printing_delivery_days || undefined,
          deliveryRegion: serverConfig.printing_delivery_region || undefined,
        });
        setQrConfig({
          upi_id: serverConfig.qr_upi_id || "",
          payee_name: serverConfig.qr_payee_name || "Printynozzle",
          image_url: serverConfig.qr_image_url || "",
        });

        const mappedMaterials = (materialsResponse.data.materials || []).map((material) => ({
          id: material.id,
          slug: material.slug,
          name: material.name,
          description: material.description,
          pricePerGram: Number(material.price_per_gram || 0),
          density: Number(material.density_g_cm3 || 1.24),
          bestFor: material.best_for,
          color_ids: Array.isArray(material.color_ids) ? material.color_ids.map(Number) : [],
          image: "/images/products/blue_filament.png",
        }));

        const mappedColors = (colorsResponse.data.colors || []).map((color) => ({
          id: color.id,
          name: color.name,
          hex: color.hex_code,
          priceAdjustment: Number(color.price_adjustment || 0),
        }));

        setServerMaterials(mappedMaterials);
        if (mappedMaterials.length > 0) {
          setSelectedMaterialId(mappedMaterials[0].id);
        }

        setServerColors(mappedColors);
        if (mappedColors.length > 0) {
          setSelectedColorHex(mappedColors[0].hex);
        }
      } catch (error) {
        setServerMaterials([]);
        setServerColors([]);
      }
    };

    loadPrintingOptions();

    return () => {
      active = false;
    };
  }, []);

  // Selected option objects
  const selectedMaterial = useMemo(() => {
    return materials.find((m) => m.id === selectedMaterialId) || materials[0];
  }, [materials, selectedMaterialId]);

  const selectedColor = useMemo(() => {
    const matched = colors.find((c) => c.hex.toLowerCase() === selectedColorHex.toLowerCase());
    if (matched) return matched;
    return { id: "custom", name: "Custom", hex: selectedColorHex, priceAdjustment: 0 };
  }, [colors, selectedColorHex]);

  // Colors offered for the selected material (admin assigns per material).
  // A material with no linked colors offers every active color.
  const availableColors = useMemo(() => {
    const linked = selectedMaterial?.color_ids;
    if (Array.isArray(linked) && linked.length > 0) {
      const allowed = new Set(linked.map(Number));
      const filtered = colors.filter((c) => allowed.has(Number(c.id)));
      return filtered.length > 0 ? filtered : colors;
    }
    return colors;
  }, [colors, selectedMaterial]);

  // Keep the selection valid when switching materials.
  useEffect(() => {
    if (!availableColors.length) return;
    const stillAvailable = availableColors.some(
      (c) => c.hex.toLowerCase() === selectedColorHex.toLowerCase()
    );
    const isCustom = !colors.some(
      (c) => c.hex.toLowerCase() === selectedColorHex.toLowerCase()
    );
    if (!stillAvailable && !isCustom) {
      setSelectedColorHex(availableColors[0].hex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableColors]);

  const hasUploadedModel = Boolean(uploadedFile && !useSample);
  const summaryModel = hasUploadedModel
    ? modelAnalysis
    : {
        ...modelAnalysis,
        dimensions: { x: 0, y: 0, z: 0 },
      };
  const summaryQuantity = hasUploadedModel ? quantity : 0;

  const pricingPayload = useMemo(() => {
    if (!selectedMaterial || !modelAnalysis || (modelAnalysis.weightGrams || 0) <= 0) return null;
    const payload = {
      estimated_weight: modelAnalysis.weightGrams,
      material_id: selectedMaterial.id,
      infill_density: 50,
      layer_height: 0.2,
      wall_loops: 2,
      surface_finish: "standard",
      quantity,
      surface_area_cm2: modelAnalysis.surfaceAreaCm2,
      support_volume_cm3: modelAnalysis.supportVolumeCm3,
    };
    if (selectedColor?.id !== "custom" && selectedColor?.id) {
      payload.color_id = selectedColor.id;
    }
    return payload;
  }, [selectedMaterial, selectedColor, modelAnalysis, quantity]);

  useEffect(() => {
    if (!hasUploadedModel || !pricingPayload) {
      setModelPricing(null);
      setModelPricingLoading(false);
      setModelPricingError(false);
      return undefined;
    }

    let active = true;
    setModelPricing(null);
    setModelPricingLoading(true);
    setModelPricingError(false);
    printingService.calculatePrice(pricingPayload)
      .then((res) => {
        if (active && res.data?.success) setModelPricing(res.data.pricing);
      })
      .catch((error) => {
        if (!active) return;
        setModelPricingError(true);
        console.error("Model pricing calc failed:", error?.response?.data?.message || error.message);
      })
      .finally(() => {
        if (active) setModelPricingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hasUploadedModel, pricingPayload]);

  /* =========================================================
     FILE UPLOAD HANDLERS
     ========================================================= */
  const handleFileUpload = (file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!SUPPORTED_MODEL_EXTS.includes(ext)) {
      toast.error(
        `Unsupported file type ".${ext}". Please upload ${SUPPORTED_MODEL_EXTS.map((e) => "." + e.toUpperCase()).join(", ")}.`
      );
      return;
    }
    if (MAX_FILE_SIZE_MB !== -1 && !isNaN(MAX_FILE_SIZE_MB)) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`File exceeds maximum size limit of ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
    }
    // New File object identity + cleared thumbnail forces the viewer to drop
    // the previous mesh and render THIS file's exact geometry.
    resetAnalysis();
    setUploadedFile(file);
    setUseSample(false);
    setModelThumb(null);
    toast.success(`Loaded ${file.name}`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const resetAnalysis = () => {
    setModelAnalysis({
      fileName: "No file loaded",
      fileSizeMB: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      volumeCm3: 0,
      weightGrams: 0,
    });
  };

  const handleRemoveModel = () => {
    setUploadedFile(null);
    setUseSample(false);
    setModelThumb(null);
    resetAnalysis();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Model removed. Upload a 3D model to request a quote.");
  };

  const handleViewerError = useCallback(
    (message) => {
      // The attached file could not be rendered exactly — drop it so the
      // viewport never keeps showing the previous ("same") model.
      setUploadedFile(null);
      setUseSample(false);
      setModelThumb(null);
      resetAnalysis();
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (message) toast.error(message);
    },
    []
  );

  const handleLoadSample = () => {
    setUploadedFile(null);
    setUseSample(true);
  };

  const handleCustomHexChange = (e) => {
    const val = e.target.value;
    setCustomHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setSelectedColorHex(val);
    }
  };

  const handleCustomColorPickerChange = (e) => {
    const val = e.target.value;
    setSelectedColorHex(val);
    setCustomHexInput(val.toUpperCase());
  };

  /* =========================================================
     WHATSAPP QUOTE — modal → server stores quotation → WhatsApp opens
     with the customer details + hosted model-file link.
     ========================================================= */
  const openQuoteModal = (mode = "whatsapp") => {
    if (!hasUploadedModel || !modelAnalysis || (modelAnalysis?.weightGrams || 0) <= 0) {
      toast.warning("Please upload a 3D model first.");
      return;
    }
    if (mode === "qr" && !String(qrConfig.upi_id || "").trim()) {
      toast.error("UPI payments are not configured yet. Please contact us for a quote.");
      return;
    }
    if (isOversized) {
      toast.error(
        `Model exceeds maximum printable volume (${MAX_PRINT_WIDTH_MM === -1 ? "No limit" : MAX_PRINT_WIDTH_MM + "mm"} × ${MAX_PRINT_DEPTH_MM === -1 ? "No limit" : MAX_PRINT_DEPTH_MM + "mm"} × ${MAX_PRINT_HEIGHT_MM === -1 ? "No limit" : MAX_PRINT_HEIGHT_MM + "mm"}). Please scale down your model.`
      );
      return;
    }
    if (!selectedMaterial) {
      toast.warning("Options are still loading. Please wait a moment and try again.");
      return;
    }
    setQuoteModalMode(mode);
    setQuoteForm(blankQuoteForm());
    setIsQuoteModalOpen(true);
  };

  /* =========================================================
     QR PAYMENT HELPERS
     ========================================================= */
  const loadQrPricing = useCallback(async () => {
    if (!pricingPayload) return null;
    setQrPricingLoading(true);
    setQrPricingError(false);
    try {
      const res = await printingService.calculatePrice(pricingPayload);
      if (res.data?.success) {
        setQrPricing(res.data.pricing);
        return res.data.pricing;
      }
      setQrPricingError(true);
    } catch (e) {
      setQrPricingError(true);
      console.error("QR pricing calc failed:", e?.response?.data?.message || e.message);
    } finally {
      setQrPricingLoading(false);
    }
    return null;
  }, [pricingPayload]);

  const handleQrScreenshotSelect = (file) => {
    if (!file) return;
    const allowed = /\.(jpe?g|png|gif|webp)$/i.test(file.name) || /^image\//.test(file.type);
    if (!allowed) {
      toast.error("Please upload an image file (JPG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be under 5MB.");
      return;
    }
    if (qrPreview) URL.revokeObjectURL(qrPreview);
    setQrScreenshot(file);
    setQrPreview(URL.createObjectURL(file));
  };

  const clearQrScreenshot = () => {
    if (qrPreview) URL.revokeObjectURL(qrPreview);
    setQrScreenshot(null);
    setQrPreview("");
  };

  const copyUpiId = async () => {
    if (!qrConfig.upi_id) return;
    try {
      await navigator.clipboard.writeText(qrConfig.upi_id);
      toast.success("UPI ID copied to clipboard.");
    } catch {
      toast.info(`UPI ID: ${qrConfig.upi_id}`);
    }
  };

  const closeQrPayment = (force = false) => {
    if (qrSubmitting && force !== true) return;
    setIsQrPaymentOpen(false);
    clearQrScreenshot();
    setQrPricing(null);
  };

  const handleQrDone = async (e) => {
    e?.preventDefault?.();
    if (qrSubmitting) return;
    if (!qrScreenshot) {
      toast.error("Please attach your payment screenshot.");
      return;
    }
    if (!uploadedFile) {
      toast.error("3D model file is missing. Please try again.");
      return;
    }
    setQrSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("screenshot", qrScreenshot);
      formData.append("customer_name", quoteForm.name.trim());
      formData.append("customer_phone", quoteForm.phone.trim());
      formData.append("customer_email", quoteForm.email.trim());
      formData.append("address1", quoteForm.address1.trim());
      formData.append("address2", quoteForm.address2.trim());
      formData.append("city", quoteForm.city.trim());
      formData.append("state", quoteForm.state.trim());
      formData.append("pincode", quoteForm.pincode.trim());
      formData.append("country", (quoteForm.country || "India").trim());
      formData.append("material_id", selectedMaterial?.id ?? "");
      formData.append("material_name", selectedMaterial?.name ?? "");
      if (selectedColor?.id !== "custom") formData.append("color_id", selectedColor?.id ?? "");
      formData.append("color_name", selectedColor?.name ?? "");
      if (selectedColor?.id === "custom") formData.append("custom_color_hex", selectedColorHex);
      formData.append("quantity", String(quantity));
      formData.append("infill_density", "50");
      formData.append("layer_height", "0.2");
      formData.append("wall_loops", "2");
      formData.append("surface_finish", "standard");
      formData.append("estimated_weight", modelAnalysis.weightGrams);
      formData.append("surface_area_cm2", modelAnalysis.surfaceAreaCm2 ?? "");
      formData.append("support_volume_cm3", modelAnalysis.supportVolumeCm3 ?? "");
      formData.append("dimension_x", modelAnalysis.dimensions?.x ?? "");
      formData.append("dimension_y", modelAnalysis.dimensions?.y ?? "");
      formData.append("dimension_z", modelAnalysis.dimensions?.z ?? "");

      const res = await printingService.createQrOrder(formData);
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Unable to place order");
      }
      const orderNo = res.data?.order?.order_number;
      toast.success(
        `Order placed${orderNo ? ` (${orderNo})` : ""}! Your invoice has been emailed. We'll verify your payment shortly.`
      );
      closeQrPayment(true);
      setIsQuoteModalOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to place order");
    } finally {
      setQrSubmitting(false);
    }
  };

  const handleQuoteSend = async (e) => {
    e?.preventDefault?.();
    if (sendingQuote) return;
    const name = quoteForm.name.trim();
    const phone = quoteForm.phone.trim();
    const email = quoteForm.email.trim();
    const country = quoteForm.country.trim() || "India";
    const address1 = quoteForm.address1.trim();
    const address2 = quoteForm.address2.trim();
    const city = quoteForm.city.trim();
    const state = quoteForm.state.trim();
    const pincode = quoteForm.pincode.trim();
    if (!name) {
      toast.error("Please enter your name.");
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!address1) {
      toast.error("Please enter your address.");
      return;
    }
    if (!uploadedFile) {
      toast.error("Please attach your 3D model file first.");
      return;
    }

    // QR mode: customer details are captured here, then the QR payment modal
    // opens so the user can scan, attach the screenshot, and place the order.
    if (quoteModalMode === "qr") {
      setIsQuoteModalOpen(false);
      setQrPricing(null);
      setQrPricingError(false);
      clearQrScreenshot();
      setIsQrPaymentOpen(true);
      loadQrPricing();
      return;
    }

    setSendingQuote(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("customer_name", name);
      formData.append("customer_phone", phone);
      formData.append("customer_email", email);
      formData.append("address1", address1);
      formData.append("address2", address2);
      formData.append("city", city);
      formData.append("state", state);
      formData.append("pincode", pincode);
      formData.append("country", country);
      formData.append("material_id", selectedMaterial?.id ?? "");
      formData.append("material_name", selectedMaterial?.name ?? "");
      if (selectedColor?.id !== "custom") formData.append("color_id", selectedColor?.id ?? "");
      formData.append("color_name", selectedColor?.name ?? "");
      if (selectedColor?.id === "custom") formData.append("custom_color_hex", selectedColorHex);
      formData.append("quantity", String(quantity));
      formData.append("dimension_x", modelAnalysis.dimensions.x);
      formData.append("dimension_y", modelAnalysis.dimensions.y);
      formData.append("dimension_z", modelAnalysis.dimensions.z);

      const res = await printingService.sendQuote(formData);
      const whatsappUrl = res.data?.whatsapp_url;
      if (!res.data?.success || !whatsappUrl) {
        throw new Error(res.data?.message || "Unable to send quote request");
      }
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening WhatsApp with your quote details!");
      setIsQuoteModalOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to send quote request");
    } finally {
      setSendingQuote(false);
    }
  };

  return (
    <div className="printing-page">
      {/* =====================================================
          HERO BANNER
          ===================================================== */}
      <section className="printing-hero">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h1 className="hero-title">
                Your Ideas.
                <span className="hero-title-highlight">Printed in 3D.</span>
              </h1>
              <p className="hero-subtitle">
                Upload your 3D model, choose your material and color, and get a
                quote instantly on WhatsApp.
              </p>

              <div className="hero-pills">
                <div className="hero-pill">
                  <div className="hero-pill-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="hero-pill-text">
                    <span className="hero-pill-title">High Quality Prints</span>
                    <span className="hero-pill-desc">Precision & detail you can trust</span>
                  </div>
                </div>

                <div className="hero-pill">
                  <div className="hero-pill-icon">
                    <Box size={20} />
                  </div>
                  <div className="hero-pill-text">
                    <span className="hero-pill-title">Wide Material</span>
                    <span className="hero-pill-desc">PLA, ABS, PETG and more</span>
                  </div>
                </div>

                <div className="hero-pill">
                  <div className="hero-pill-icon">
                    <Truck size={20} />
                  </div>
                  <div className="hero-pill-text">
                    <span className="hero-pill-title">Fast Delivery</span>
                    <span className="hero-pill-desc">Quick turnaround across India</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="hero-image-wrapper">
                <img
                  src="/images/3d_printer_hero.jpg"
                  alt="3D Printer Printing Rocket"
                  className="hero-printer-image"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PROCESS STEPPER
          ===================================================== */}
      <section className="stepper-section">
        <div className="container">
          <h2 className="stepper-heading">Get Your 3D Print in 3 Easy Steps</h2>
          <div className="stepper-container">
            <div className="step-item">
              <div className="step-badge">1</div>
              <div className="step-content">
                <span className="step-title">Upload Model</span>
                <span className="step-subtitle">Upload your 3D file (STL, OBJ, 3MF…)</span>
              </div>
            </div>

            <div className="step-arrow">
              <ArrowRight size={20} />
            </div>

            <div className="step-item">
              <div className="step-badge">2</div>
              <div className="step-content">
                <span className="step-title">Choose Options</span>
                <span className="step-subtitle">Select material, color & quantity</span>
              </div>
            </div>

            <div className="step-arrow">
              <ArrowRight size={20} />
            </div>

            <div className="step-item">
              <div className="step-badge">3</div>
              <div className="step-content">
                <span className="step-title">Get Quote</span>
                <span className="step-subtitle">Send it on WhatsApp & get pricing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN BUILDER: 2 COLUMNS
          ===================================================== */}
      <section className="builder-section">
        <div className="container">
          <div className="row">
            {/* ---------------- LEFT COLUMN (Upload & Options) ---------------- */}
            <div className="col-lg-8 mb-4 mb-lg-0">
              {/* STEP 1: UPLOAD */}
              <div className="mb-5">
                <div className="step-header-row">
                  <div>
                    <h3 className="section-label mb-1">
                      <span className="section-label-number">1.</span> Upload your 3D files
                    </h3>
                    <span className="step-label-sub">
                      Supports {SUPPORTED_MODEL_EXTS.map((e) => "." + e.toUpperCase()).join(", ")}{" "}
                      {MAX_FILE_SIZE_MB === -1
                        ? "(No file size limit)"
                        : `• Max ${MAX_FILE_SIZE_MB}MB per file`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-add-more"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus size={16} />
                    <span>{useSample || uploadedFile ? "Add more" : "Choose File"}</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_MODEL_ACCEPT}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />

                <div className="upload-viewer-container">
                  {useSample || uploadedFile ? (
                    <div
                      className={`viewer-display-card is-fullwidth ${isDragActive ? "drag-active" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <ModelViewer3D
                        key={
                          uploadedFile
                            ? `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.lastModified}`
                            : "sample"
                        }
                        file={uploadedFile}
                        color={selectedColorHex}
                        materialType={selectedMaterial?.id}
                        density={selectedMaterial?.density}
                        useSample={useSample}
                        onAnalysis={handleModelAnalysis}
                        onThumbnail={setModelThumb}
                        onError={handleViewerError}
                        onRemove={handleRemoveModel}
                      />
                      {isOversized && (
                        <div className="viewer-meta-bar">
                          <div className="dimension-warning-pill">
                            <AlertTriangle size={13} />
                            <span>
                              Exceeds max build volume (
                              {MAX_PRINT_WIDTH_MM === -1 ? "∞" : `${MAX_PRINT_WIDTH_MM}`} ×{" "}
                              {MAX_PRINT_DEPTH_MM === -1 ? "∞" : `${MAX_PRINT_DEPTH_MM}`} ×{" "}
                              {MAX_PRINT_HEIGHT_MM === -1 ? "∞" : `${MAX_PRINT_HEIGHT_MM}`} mm)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Dropzone Card (Full Width) */
                    <div
                      className={`upload-dropzone-card is-fullwidth ${isDragActive ? "drag-active" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="dropzone-icon-wrap">
                        <UploadCloud size={32} />
                      </div>
                      <div className="dropzone-title">Drag & drop your 3D file here</div>
                      <div className="dropzone-or">or</div>
                      <button
                        type="button"
                        className="btn-choose-file"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Choose File
                      </button>
                      <div className="dropzone-supports">
                        Supports: {SUPPORTED_MODEL_EXTS.map((e) => "." + e.toUpperCase()).join(" • ")}{" "}
                        {MAX_FILE_SIZE_MB === -1
                          ? "(No file size limit)"
                          : `(Max file size: ${MAX_FILE_SIZE_MB}MB)`}
                      </div>
                      <button
                        type="button"
                        className="btn btn-link text-decoration-none small text-muted mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSample();
                        }}
                      >
                        or preview demo sample model
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: CHOOSE YOUR OPTIONS */}
              <div ref={optionsSectionRef} className="options-container">
                <h3 className="section-label">
                  <span className="section-label-number">2.</span> Choose Your Options
                </h3>

                {/* Material & Color in Row */}
                <div className="options-row-flex">
                  {/* Material */}
                  <div>
                    <div className="option-group-label">Material</div>
                    <div className="material-cards-grid">
                      {materials.length ? materials.map((mat) => {
                        const isSelected = mat.id === selectedMaterialId;
                        return (
                          <div
                            key={mat.id}
                            className={`material-card ${isSelected ? "active" : ""}`}
                            onClick={() => setSelectedMaterialId(mat.id)}
                          >
                            <div className="material-name">{mat.name}</div>
                            {mat.description && (
                              <div className="material-price">{mat.description}</div>
                            )}
                            {mat.pricePerGram > 0 && (
                              <div className="material-rate">₹{Number(mat.pricePerGram).toFixed(2)}/g</div>
                            )}
                          </div>
                        );
                      }) : <div className="text-muted py-2">No materials available</div>}
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div>
                    <div className="option-group-label">Color</div>
                    <div className="color-swatches-box">
                      <div className="color-swatches-grid">
                        {availableColors.length ? availableColors.map((c) => {
                          const isSelected = selectedColorHex.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={`color-swatch-item ${isSelected ? "active" : ""}`}
                              style={{
                                backgroundColor: c.hex,
                                border: c.hex.toLowerCase() === "#ffffff" ? "1px solid #cbd5e1" : "none",
                              }}
                              onClick={() => setSelectedColorHex(c.hex)}
                              title={c.name}
                              aria-label={c.name}
                            />
                          );
                        }) : <div className="text-muted py-2">No colors available</div>}
                      </div>

                      {/* Custom Color Input */}
                      <div className="custom-color-row">
                        <span className="custom-color-label">Custom Color (Optional)</span>
                        <div className="custom-color-input-wrap">
                          <input
                            type="text"
                            placeholder="Enter HEX code (e.g. #1E88E5)"
                            className="custom-color-input"
                            value={customHexInput}
                            onChange={handleCustomHexChange}
                          />
                          <input
                            type="color"
                            className="color-picker-native"
                            value={selectedColorHex}
                            onChange={handleCustomColorPickerChange}
                            title="Open Color Picker"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <div className="option-group-label">Quantity</div>
                  <div className="qty-stepper-box">
                    <button
                      type="button"
                      className="qty-stepper-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus size={15} />
                    </button>
                    <span className="qty-stepper-val">{quantity}</span>
                    <button
                      type="button"
                      className="qty-stepper-btn"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- RIGHT COLUMN (Sticky Order Summary) ---------------- */}
            <div className="col-lg-4">
              <div className="order-summary-card">
                <h3 className="summary-heading">Order Summary</h3>

                {/* Model Info Header */}
                <div className="summary-model-item">
                  <div className="summary-model-thumb-wrap">
                    <img
                      src={modelThumb || "/images/rocket.png"}
                      alt="3D Model Preview"
                      className="summary-model-thumb"
                    />
                  </div>
                  <div className="summary-model-details">
                    <div className="summary-model-filename">{summaryModel.fileName}</div>
                    <div className="summary-model-dim">
                      {summaryModel.dimensions.x} x {summaryModel.dimensions.y} x{" "}
                      {summaryModel.dimensions.z} mm
                    </div>
                    <div className="summary-model-tags">
                      {selectedMaterial?.name || "—"} • {selectedColor?.name || "Custom"} • Qty: {summaryQuantity}
                    </div>
                    <button
                      type="button"
                      className="btn-summary-edit"
                      onClick={() => {
                        optionsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Edit Model
                    </button>
                  </div>
                </div>

                <div className="summary-divider" />

                {hasUploadedModel && (
                  <div className="summary-price-breakdown">
                    <div className="summary-price-title">Price Breakdown</div>
                    {modelPricingLoading && (
                      <div className="summary-price-status">Calculating weight and GST-inclusive price...</div>
                    )}
                    {modelPricingError && !modelPricingLoading && (
                      <div className="summary-price-status is-error">Unable to calculate the price. Please try again.</div>
                    )}
                    {modelPricing && (
                      <>
                        <div className="summary-weight-note">
                          Estimated filament: {Number(modelPricing.effectiveWeight || 0).toFixed(2)} g per piece
                          {quantity > 1 ? ` × ${quantity} pieces` : ""}
                        </div>
                        <div className="summary-price-row">
                          <span>Material ({Number(modelPricing.effectiveWeight || 0).toFixed(2)} g × ₹{Number(modelPricing.price_per_gram || 0).toFixed(2)}/g)</span>
                          <strong>{formatRupees(Number(modelPricing.materialCost || 0) * quantity)}</strong>
                        </div>
                        <div className="summary-price-row">
                          <span>Printing time ({Number(modelPricing.printTimeHours || 0).toFixed(2)} h × ₹{Number(modelPricing.timeRate || 0).toFixed(2)}/h)</span>
                          <strong>{formatRupees(Number(modelPricing.timeCost || 0) * quantity)}</strong>
                        </div>
                        <div className="summary-price-row">
                          <span>Color</span>
                          <strong>{formatRupees(Number(modelPricing.colorCost || 0) * quantity)}</strong>
                        </div>
                        <div className="summary-price-row">
                          <span>Finish</span>
                          <strong>{formatRupees(Number(modelPricing.finishCost || 0) * quantity)}</strong>
                        </div>
                        <div className="summary-price-row">
                          <span>Subtotal ({quantity} {quantity === 1 ? "piece" : "pieces"})</span>
                          <strong>{formatRupees(modelPricing.subtotal)}</strong>
                        </div>
                        <div className="summary-price-row">
                          <span>GST ({Number(modelPricing.gstRate || 0)}%)</span>
                          <strong>{formatRupees(modelPricing.taxAmount)}</strong>
                        </div>
                        <div className="summary-price-total">
                          <span>Total including GST</span>
                          <strong>{formatRupees(modelPricing.totalAmount)}</strong>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {hasUploadedModel && <div className="summary-divider" />}

                {/* Delivery Guarantee Pill */}
                <div className="summary-delivery-box">
                  <Truck size={22} className="summary-delivery-icon" />
                  <div className="summary-delivery-text">
                    <span className="summary-delivery-label">Estimated Delivery</span>
                    <span className="summary-delivery-time">
                      {deliveryDays} {deliveryRegion}
                    </span>
                  </div>
                </div>

                {/* Oversized Warning Alert */}
                {hasUploadedModel && isOversized && (
                  <div className="summary-oversized-alert">
                    <AlertTriangle size={18} className="flex-shrink-0" />
                    <span>
                      Model exceeds maximum build volume (
                      {MAX_PRINT_WIDTH_MM === -1 ? "∞" : `${MAX_PRINT_WIDTH_MM}`} ×{" "}
                      {MAX_PRINT_DEPTH_MM === -1 ? "∞" : `${MAX_PRINT_DEPTH_MM}`} ×{" "}
                      {MAX_PRINT_HEIGHT_MM === -1 ? "∞" : `${MAX_PRINT_HEIGHT_MM}`} mm).
                      Please scale down to request a quote.
                    </span>
                  </div>
                )}

                {/* Payment CTAs */}
                <div className="summary-actions" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-buy-now"
                    onClick={() => openQuoteModal("whatsapp")}
                    disabled={!hasUploadedModel || isOversized}
                    title="Send your model + details on WhatsApp for a price quote"
                  >
                    <MessageCircle size={18} />
                    <span>Send a WhatsApp Quote</span>
                  </button>
                  <button
                    type="button"
                    className="btn-buy-now"
                    onClick={() => openQuoteModal("qr")}
                    disabled={!hasUploadedModel || isOversized}
                    style={{ backgroundColor: "#0f766e", borderColor: "#0f766e" }}
                    title="Pay instantly via UPI QR and get your invoice emailed"
                  >
                    <ShieldCheck size={18} />
                    <span>Pay with QR</span>
                  </button>
                </div>
                <div className="summary-help-note" style={{ marginTop: 8 }}>
                  Replies on WhatsApp: {WHATSAPP_DISPLAY_NUMBER}
                </div>

                <div className="summary-help-note">
                  Need help?{" "}
                  <Link to="/contact" className="summary-help-link">
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          WHY CHOOSE OUR 3D PRINTING SERVICE?
          ===================================================== */}
      <section className="why-choose-section">
        <div className="container">
          <h2 className="why-choose-heading">Why Choose Our 3D Printing Service?</h2>
          <div className="why-features-grid">
            <div className="why-feature-card">
              <div className="why-icon-box">
                <Sparkles size={22} />
              </div>
              <div className="why-content">
                <span className="why-title">Precision & Quality</span>
                <span className="why-desc">High accuracy prints with smooth finish</span>
              </div>
            </div>

            <div className="why-feature-card">
              <div className="why-icon-box">
                <Layers size={22} />
              </div>
              <div className="why-content">
                <span className="why-title">Wide Material Range</span>
                <span className="why-desc">Multiple materials to suit your needs</span>
              </div>
            </div>

            <div className="why-feature-card">
              <div className="why-icon-box">
                <ShieldCheck size={22} />
              </div>
              <div className="why-content">
                <span className="why-title">Secure & Reliable</span>
                <span className="why-desc">Your files are safe and secure with us</span>
              </div>
            </div>

            <div className="why-feature-card">
              <div className="why-icon-box">
                <Headphones size={22} />
              </div>
              <div className="why-content">
                <span className="why-title">Customer Support</span>
                <span className="why-desc">We're here to help you at every step</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          POPULAR MATERIALS GUIDE
          ===================================================== */}
      <section className="materials-guide-section">
        <div className="container">
          <div className="guide-header-row">
            <h2 className="guide-heading">Popular Materials Guide</h2>
            <Link to="/products" className="guide-all-link">
              <span>View all materials</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="guide-cards-grid">
            {materials.map((mat) => (
              <div key={mat.id} className="guide-card">
                <div className="guide-spool-wrap">
                  <img
                    src={mat.image || "/images/products/blue_filament.png"}
                    alt={mat.name}
                    className="guide-spool-img"
                  />
                </div>
                <div className="guide-material-title">{mat.name}</div>
                {mat.pricePerGram > 0 && (
                  <div className="guide-material-rate">₹{Number(mat.pricePerGram).toFixed(2)}/g</div>
                )}
                <div className="guide-material-desc">{mat.description}</div>
                <div className="guide-material-best">
                  <span>Best for:</span> {mat.bestFor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          WHATSAPP QUOTE MODAL
          ===================================================== */}
      {isQuoteModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => !sendingQuote && setIsQuoteModalOpen(false)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleQuoteSend}>
              <div className="admin-modal-header">
                <span className="admin-modal-title">
                  {quoteModalMode === "qr" ? "Your Details" : "Get Quote on WhatsApp"}
                </span>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => !sendingQuote && setIsQuoteModalOpen(false)}
                  disabled={sendingQuote}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="admin-modal-body">
                <p className="text-secondary small mb-3">
                  {quoteModalMode === "qr"
                    ? "Enter your details. On submit you'll see the price + a UPI QR to pay, then attach your payment screenshot to place the order and receive the invoice by email."
                    : `Share your details and we will open WhatsApp with your quote request — including your uploaded file (${modelAnalysis.fileName}) — addressed to ${WHATSAPP_DISPLAY_NUMBER}.`}
                </p>
                <div className="quote-form-grid">
                  <label className="quote-field"><span>Your Name <b>*</b></span>
                    <input
                      required
                      value={quoteForm.name}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Full name"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Phone Number <b>*</b></span>
                    <input
                      required
                      value={quoteForm.phone}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="10-digit mobile number"
                      inputMode="tel"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Email Address</span>
                    <input
                      type="email"
                      value={quoteForm.email}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com (optional)"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Country</span>
                    <input
                      value={quoteForm.country}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, country: e.target.value }))}
                      placeholder="India"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Address Line 1 <b>*</b></span>
                    <input
                      required
                      value={quoteForm.address1}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, address1: e.target.value }))}
                      placeholder="House no., street, area"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Address Line 2</span>
                    <input
                      value={quoteForm.address2}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, address2: e.target.value }))}
                      placeholder="Landmark (optional)"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>City</span>
                    <input
                      value={quoteForm.city}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="City"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>State</span>
                    <input
                      value={quoteForm.state}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, state: e.target.value }))}
                      placeholder="West Bengal"
                      disabled={sendingQuote}
                    />
                  </label>
                  <label className="quote-field"><span>Pincode</span>
                    <input
                      value={quoteForm.pincode}
                      onChange={(e) => setQuoteForm((f) => ({ ...f, pincode: e.target.value }))}
                      placeholder="Pincode"
                      inputMode="numeric"
                      disabled={sendingQuote}
                    />
                  </label>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsQuoteModalOpen(false)}
                  disabled={sendingQuote}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={sendingQuote}
                >
                  {quoteModalMode === "qr" ? (
                    <>
                      <ShieldCheck size={15} style={{ marginRight: 6 }} />
                      Continue to Payment
                    </>
                  ) : (
                    <>
                      <MessageCircle size={15} style={{ marginRight: 6 }} />
                      {sendingQuote ? "Sending..." : "Send on WhatsApp"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          QR PAYMENT MODAL
          ===================================================== */}
      {isQrPaymentOpen && (
        <div className="admin-modal-backdrop" onClick={closeQrPayment}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <form onSubmit={handleQrDone}>
              <div className="admin-modal-header">
                <span className="admin-modal-title">Pay with UPI QR</span>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeQrPayment}
                  disabled={qrSubmitting}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="admin-modal-body">
                {/* Price breakdown */}
                <div className="qr-price-breakdown">
                  {qrPricingLoading && <div className="qr-price-status">Calculating your final price...</div>}
                  {qrPricingError && !qrPricingLoading && (
                    <div className="qr-price-status is-error">Price calculation failed. Close this window and try again.</div>
                  )}
                  {qrPricing && (
                    <>
                      <div className="qr-price-weight">
                        Estimated filament: {Number(qrPricing.effectiveWeight || 0).toFixed(2)} g per piece
                        {quantity > 1 ? ` × ${quantity} pieces` : ""}
                      </div>
                      <div className="qr-price-row">
                        <span>Material ({Number(qrPricing.effectiveWeight || 0).toFixed(2)} g × ₹{Number(qrPricing.price_per_gram || 0).toFixed(2)}/g)</span>
                        <span>{formatRupees(Number(qrPricing.materialCost || 0) * quantity)}</span>
                      </div>
                      <div className="qr-price-row">
                        <span>Printing time ({Number(qrPricing.printTimeHours || 0).toFixed(2)} h × ₹{Number(qrPricing.timeRate || 0).toFixed(2)}/h)</span>
                        <span>{formatRupees(Number(qrPricing.timeCost || 0) * quantity)}</span>
                      </div>
                      <div className="qr-price-row">
                        <span>Color</span>
                        <span>{formatRupees(Number(qrPricing.colorCost || 0) * quantity)}</span>
                      </div>
                      <div className="qr-price-row">
                        <span>Finish</span>
                        <span>{formatRupees(Number(qrPricing.finishCost || 0) * quantity)}</span>
                      </div>
                      <div className="qr-price-row">
                        <span>Subtotal ({quantity} {quantity === 1 ? "piece" : "pieces"})</span>
                        <span>{formatRupees(qrPricing.subtotal)}</span>
                      </div>
                      <div className="qr-price-row">
                        <span>GST ({Number(qrPricing.gstRate || 0)}%)</span>
                        <span>{formatRupees(qrPricing.taxAmount)}</span>
                      </div>
                      <div className="qr-price-row qr-price-total">
                        <span>Total including GST</span>
                        <span>{formatRupees(qrGrandTotal)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Step 1 — Scan & pay */}
                <div className="qr-pay-steps" style={{ marginTop: 12 }}>
                  {qrPricing ? `Step 1 — Scan and pay ${formatRupees(qrGrandTotal)}` : "Step 1 — Preparing your payment amount"}
                </div>
                <div className="qr-pay-qr-wrap" style={{ textAlign: "center", margin: "12px 0" }}>
                  {upiPayUrl ? (
                    <div className="qr-pay-dynamic">
                      <QRCodeSVG value={upiPayUrl} size={200} level="M" className="qr-pay-img" />
                      <span className="qr-pay-amount-note">
                        Scan with a UPI app — the exact amount is pre-filled
                      </span>
                    </div>
                  ) : (
                    <div className="qr-pay-noimg" style={{ padding: 24, border: "1px dashed #cbd5e1", borderRadius: 8 }}>
                      <span>
                        {qrPricingLoading
                          ? "The payment QR will appear when the final amount is ready."
                          : qrPricingError
                            ? "Unable to prepare the payment QR. Please try again."
                            : "Payment QR unavailable. Please contact us for help."}
                      </span>
                    </div>
                  )}
                </div>

                {(qrConfig.upi_id || qrConfig.payee_name) && (
                  <div className="qr-pay-upi-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div className="qr-pay-upi-meta">
                      <span className="qr-pay-payee" style={{ fontWeight: 600 }}>{qrConfig.payee_name || "Printynozzle"}</span>
                      {qrConfig.upi_id && <span className="upi-id-badge" style={{ marginLeft: 8, fontSize: 13 }}>UPI ID: {qrConfig.upi_id}</span>}
                    </div>
                    {qrConfig.upi_id && (
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copyUpiId}>
                        Copy ID
                      </button>
                    )}
                  </div>
                )}

                {/* Step 2 — Attach screenshot */}
                <div className="qr-pay-steps">Step 2 — Attach your payment screenshot, then click Done</div>
                <label className="qr-pay-upload" style={{ display: "block", marginTop: 8 }}>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleQrScreenshotSelect(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                  <span className="qr-pay-upload-btn" style={{ display: "inline-block", padding: "8px 14px", border: "1px solid #0f766e", color: "#0f766e", borderRadius: 6, cursor: "pointer" }}>
                    Choose Screenshot
                  </span>
                  <span className="qr-pay-upload-hint" style={{ marginLeft: 10, fontSize: 13, color: "#64748b" }}>
                    JPG, PNG or WebP • Max 5MB
                  </span>
                </label>
                {qrPreview && (
                  <div className="qr-pay-preview-row" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <img src={qrPreview} alt="Payment screenshot preview" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={clearQrScreenshot}
                      disabled={qrSubmitting}
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="razorpay-only-note" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, color: "#475569" }}>
                  <ShieldCheck size={15} />
                  <span>Your order is placed only after the screenshot is attached. Our team verifies the payment and confirms your order.</span>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={closeQrPayment}
                  disabled={qrSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={qrSubmitting || !qrScreenshot || !qrPricing || !upiPayUrl}
                >
                  {qrSubmitting ? "Placing order..." : "Done — Place Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
