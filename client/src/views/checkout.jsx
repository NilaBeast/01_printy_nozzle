import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  Zap,
  Clock,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Lock,
  Tag,
  CreditCard,
  Building2,
  Wallet,
  Banknote,
  QrCode,
  Info,
} from "lucide-react";
import "../../public/css/checkout.css";

// Default items if cart is empty, exactly matching the screenshot
const DEFAULT_CHECKOUT_ITEMS = [
  {
    id: 1,
    name: "ESP32 DevKit V1",
    subtitle: "Microcontrollers",
    image: "/images/products/01.png",
    price: 499,
    quantity: 1,
  },
  {
    id: 2,
    name: "PLA 3D Printer Filament",
    subtitle: "Blue | 1kg",
    image: "/images/products/blue_filament.png",
    price: 899,
    quantity: 1,
  },
  {
    id: 3,
    name: "Precision Screwdriver Set",
    subtitle: "25 in 1",
    image: "/images/products/screwdriver_set.png",
    price: 299,
    quantity: 1,
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];

export default function Checkout() {
  const navigate = useNavigate();

  // Load items from cart or fallback to initial 3 items matching screenshot
  const [checkoutItems, setCheckoutItems] = useState(() => {
    try {
      const saved = localStorage.getItem("printy_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CHECKOUT_ITEMS;
  });

  // Shipping Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    emailAddress: "",
    pincode: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "West Bengal",
    country: "India",
    saveAddress: true,
  });

  // Shipping Option: "standard" | "express" | "sameday"
  const [shippingOption, setShippingOption] = useState("standard");

  // Payment Method: "upi" | "cards" | "netbanking" | "wallets" | "cod"
  const [paymentMethod, setPaymentMethod] = useState("upi");

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  // Financial calculations
  const subtotal = useMemo(() => {
    return checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [checkoutItems]);

  const shippingFee = useMemo(() => {
    if (shippingOption === "express") return 99;
    if (shippingOption === "sameday") return 149;
    return 0; // Standard is FREE for orders above ₹999
  }, [shippingOption]);

  const discount = useMemo(() => {
    return +(subtotal * (discountPercent / 100)).toFixed(2);
  }, [subtotal, discountPercent]);

  const gstTax = useMemo(() => {
    return +((subtotal - discount) * 0.18).toFixed(2);
  }, [subtotal, discount]);

  const grandTotal = useMemo(() => {
    return +(subtotal - discount + gstTax + shippingFee).toFixed(2);
  }, [subtotal, discount, gstTax, shippingFee]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCheckPincode = () => {
    if (!formData.pincode || formData.pincode.length < 6) {
      toast.error("Please enter a valid 6-digit PIN code");
      return;
    }
    toast.success(`PIN code ${formData.pincode} is serviceable for Fast Delivery!`);
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.warn("Please enter a coupon code");
      return;
    }
    if (code === "PRINTY10" || code === "ELECTRO10" || code === "SAVE10") {
      setDiscountPercent(10);
      toast.success(`Coupon ${code} applied! 10% discount added.`);
    } else {
      toast.error("Invalid coupon code. Try 'PRINTY10'");
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phoneNumber || !formData.addressLine1 || !formData.pincode) {
      toast.warn("Please fill in all required shipping information fields.");
      return;
    }
    toast.success("Order Placed Successfully! Thank you for shopping with PrintyNozzle.");
    try {
      localStorage.removeItem("printy_cart");
    } catch (err) {}
    setTimeout(() => {
      navigate("/");
    }, 1800);
  };

  return (
    <div className="checkout-page-wrapper">
      <div className="checkout-page-container">
        {/* ================= HEADER & BREADCRUMB ================= */}
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <div className="checkout-breadcrumb">
            <Link to="/">Home</Link>
            <span>&gt;</span>
            <span className="checkout-breadcrumb-current">Checkout</span>
          </div>
        </div>

        {/* ================= PROGRESS STEPPER ================= */}
        <div className="checkout-stepper">
          {/* Step 1: Cart */}
          <Link to="/cart" className="step-item completed" style={{ textDecoration: "none" }}>
            <span className="step-circle">
              <Check size={16} strokeWidth={3} />
            </span>
            <span>Cart</span>
          </Link>

          <div className="step-connector active" />

          {/* Step 2: Shipping */}
          <div className="step-item active">
            <span className="step-circle">2</span>
            <span>Shipping</span>
          </div>

          <div className="step-connector" />

          {/* Step 3: Payment */}
          <div className="step-item">
            <span className="step-circle">3</span>
            <span>Payment</span>
          </div>

          <div className="step-connector" />

          {/* Step 4: Review & Place Order */}
          <div className="step-item">
            <span className="step-circle">4</span>
            <span>Review &amp; Place Order</span>
          </div>
        </div>

        {/* ================= MAIN 2-COLUMN LAYOUT ================= */}
        <form onSubmit={handlePlaceOrder}>
          <div className="checkout-layout-grid">
            {/* ================= LEFT COLUMN ================= */}
            <div className="checkout-left-col">
              {/* Card 1: Shipping Information */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Shipping Information</h2>
                  <p className="checkout-card-sub">Enter your delivery address</p>
                </div>

                <div className="checkout-form-grid">
                  {/* Full Name */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Full Name</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="checkout-input"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Phone Number</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter 10 digit mobile number"
                      className="checkout-input"
                      required
                    />
                  </div>

                  {/* Email Address */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Email Address</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      name="emailAddress"
                      value={formData.emailAddress}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                      className="checkout-input"
                      required
                    />
                  </div>

                  {/* Pincode with Check Pincode button */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Pincode</span>
                      <span className="required">*</span>
                    </label>
                    <div className="checkout-input-wrapper">
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        placeholder="Enter pincode"
                        className="checkout-input"
                        maxLength={6}
                        required
                      />
                      <button
                        type="button"
                        className="btn-check-pincode"
                        onClick={handleCheckPincode}
                      >
                        Check Pincode
                      </button>
                    </div>
                  </div>

                  {/* Address Line 1 */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Address Line 1</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="House no., Building, Street"
                      className="checkout-input"
                      required
                    />
                  </div>

                  {/* Address Line 2 (Optional) */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>Address Line 2 (Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="Apartment, Landmark, Area"
                      className="checkout-input"
                    />
                  </div>

                  {/* City */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>City</span>
                      <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      className="checkout-input"
                      required
                    />
                  </div>

                  {/* State */}
                  <div className="checkout-field-group">
                    <label className="checkout-label">
                      <span>State</span>
                      <span className="required">*</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="checkout-select"
                      required
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Country */}
                  <div className="checkout-field-group form-group-full">
                    <label className="checkout-label">
                      <span>Country</span>
                      <span className="required">*</span>
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="checkout-select"
                    >
                      <option value="India">India</option>
                    </select>
                  </div>

                  {/* Save address checkbox */}
                  <div className="checkout-checkbox-row">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      name="saveAddress"
                      checked={formData.saveAddress}
                      onChange={handleInputChange}
                      className="checkout-checkbox"
                    />
                    <label htmlFor="saveAddress" className="checkout-checkbox-label">
                      Save this address for faster checkout next time
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 2: Shipping Options */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Shipping Options</h2>
                  <p className="checkout-card-sub">Choose a delivery option</p>
                </div>

                <div className="shipping-options-list">
                  {/* Option 1: Standard Delivery */}
                  <div
                    className={`shipping-option-item ${shippingOption === "standard" ? "selected" : ""}`}
                    onClick={() => setShippingOption("standard")}
                  >
                    <div className="shipping-opt-left">
                      <div className="shipping-radio-dot">
                        <div className="shipping-radio-inner" />
                      </div>
                      <div className="shipping-opt-icon">
                        <Truck size={20} />
                      </div>
                      <div className="shipping-opt-info">
                        <span className="shipping-opt-title">Standard Delivery</span>
                        <span className="shipping-opt-time">3 - 5 Working Days</span>
                      </div>
                    </div>
                    <div className="shipping-opt-price-group">
                      <span className="shipping-opt-price free">FREE</span>
                      <div className="shipping-opt-threshold">on orders above ₹999</div>
                    </div>
                  </div>

                  {/* Option 2: Express Delivery */}
                  <div
                    className={`shipping-option-item ${shippingOption === "express" ? "selected" : ""}`}
                    onClick={() => setShippingOption("express")}
                  >
                    <div className="shipping-opt-left">
                      <div className="shipping-radio-dot">
                        <div className="shipping-radio-inner" />
                      </div>
                      <div className="shipping-opt-icon">
                        <Zap size={20} />
                      </div>
                      <div className="shipping-opt-info">
                        <span className="shipping-opt-title">Express Delivery</span>
                        <span className="shipping-opt-time">1 - 2 Working Days</span>
                      </div>
                    </div>
                    <div className="shipping-opt-price-group">
                      <span className="shipping-opt-price">₹99</span>
                    </div>
                  </div>

                  {/* Option 3: Same Day Delivery */}
                  <div
                    className={`shipping-option-item ${shippingOption === "sameday" ? "selected" : ""}`}
                    onClick={() => setShippingOption("sameday")}
                  >
                    <div className="shipping-opt-left">
                      <div className="shipping-radio-dot">
                        <div className="shipping-radio-inner" />
                      </div>
                      <div className="shipping-opt-icon">
                        <Clock size={20} />
                      </div>
                      <div className="shipping-opt-info">
                        <span className="shipping-opt-title">Same Day Delivery</span>
                        <span className="shipping-opt-time">Within same day (Selected cities only)</span>
                      </div>
                    </div>
                    <div className="shipping-opt-price-group">
                      <span className="shipping-opt-price">₹149</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch notice */}
                <div className="shipping-dispatch-notice">
                  <Info size={16} />
                  <span>Order before 2:00 PM for same day dispatch</span>
                </div>
              </div>

              {/* Card 3: Payment Methods */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <h2 className="checkout-card-title">Payment Methods</h2>
                  <p className="checkout-card-sub">Select a payment method</p>
                </div>

                <div className="payment-methods-wrapper">
                  {/* Left Sidebar Tabs */}
                  <div className="payment-sidebar">
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "upi" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("upi")}
                    >
                      <div className="payment-tab-icon-wrap">
                        <QrCode size={18} />
                      </div>
                      <div className="payment-tab-texts">
                        <span className="payment-tab-name">UPI</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "cards" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("cards")}
                    >
                      <div className="payment-tab-icon-wrap">
                        <CreditCard size={18} />
                      </div>
                      <div className="payment-tab-texts">
                        <span className="payment-tab-name">Cards</span>
                        <span className="payment-tab-desc">Visa, MasterCard, RuPay</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "netbanking" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("netbanking")}
                    >
                      <div className="payment-tab-icon-wrap">
                        <Building2 size={18} />
                      </div>
                      <div className="payment-tab-texts">
                        <span className="payment-tab-name">Net Banking</span>
                        <span className="payment-tab-desc">All major banks</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "wallets" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("wallets")}
                    >
                      <div className="payment-tab-icon-wrap">
                        <Wallet size={18} />
                      </div>
                      <div className="payment-tab-texts">
                        <span className="payment-tab-name">Wallets</span>
                        <span className="payment-tab-desc">PhonePe, Paytm, etc.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethod === "cod" ? "active" : ""}`}
                      onClick={() => setPaymentMethod("cod")}
                    >
                      <div className="payment-tab-icon-wrap">
                        <Banknote size={18} />
                      </div>
                      <div className="payment-tab-texts">
                        <span className="payment-tab-name">COD</span>
                        <span className="payment-tab-desc">Cash on Delivery</span>
                      </div>
                    </button>
                  </div>

                  {/* Right Tab Content */}
                  <div className="payment-content-body">
                    {paymentMethod === "upi" && (
                      <div>
                        <div className="upi-section-title">Pay using UPI</div>
                        <div className="upi-apps-row">
                          <div className="upi-app-badge">GPay</div>
                          <div className="upi-app-badge">PhonePe</div>
                          <div className="upi-app-badge">Paytm</div>
                          <div className="upi-app-badge">BHIM</div>
                          <div className="upi-app-badge">CRED</div>
                        </div>

                        <div className="upi-scan-title">Or scan &amp; pay</div>
                        <div className="upi-qr-box">
                          {/* Clean SVG QR code representation */}
                          <svg
                            className="upi-qr-img"
                            viewBox="0 0 100 100"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect width="100" height="100" fill="white" />
                            {/* Corner 1 */}
                            <rect x="10" y="10" width="24" height="24" rx="2" fill="#0f172a" />
                            <rect x="14" y="14" width="16" height="16" fill="white" />
                            <rect x="18" y="18" width="8" height="8" fill="#0f172a" />
                            {/* Corner 2 */}
                            <rect x="66" y="10" width="24" height="24" rx="2" fill="#0f172a" />
                            <rect x="70" y="14" width="16" height="16" fill="white" />
                            <rect x="74" y="18" width="8" height="8" fill="#0f172a" />
                            {/* Corner 3 */}
                            <rect x="10" y="66" width="24" height="24" rx="2" fill="#0f172a" />
                            <rect x="14" y="70" width="16" height="16" fill="white" />
                            <rect x="18" y="74" width="8" height="8" fill="#0f172a" />
                            {/* Random clean matrix dots */}
                            <rect x="42" y="12" width="6" height="6" fill="#0f172a" />
                            <rect x="52" y="18" width="6" height="6" fill="#0f172a" />
                            <rect x="42" y="28" width="6" height="6" fill="#0f172a" />
                            <rect x="12" y="44" width="6" height="6" fill="#0f172a" />
                            <rect x="24" y="44" width="6" height="6" fill="#0f172a" />
                            <rect x="36" y="44" width="14" height="6" fill="#0f172a" />
                            <rect x="56" y="44" width="6" height="12" fill="#0f172a" />
                            <rect x="72" y="44" width="16" height="6" fill="#0f172a" />
                            <rect x="44" y="60" width="8" height="8" fill="#0f172a" />
                            <rect x="60" y="66" width="12" height="6" fill="#0f172a" />
                            <rect x="78" y="72" width="10" height="10" fill="#0f172a" />
                            <rect x="44" y="80" width="14" height="6" fill="#0f172a" />
                          </svg>
                          <span className="upi-id-badge">UPI ID: printynozzle@upi</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "cards" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="checkout-field-group">
                          <label className="checkout-label">Card Number</label>
                          <input type="text" placeholder="1234 5678 9012 3456" className="checkout-input" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div className="checkout-field-group">
                            <label className="checkout-label">Expiry Date</label>
                            <input type="text" placeholder="MM/YY" className="checkout-input" />
                          </div>
                          <div className="checkout-field-group">
                            <label className="checkout-label">CVV</label>
                            <input type="password" placeholder="123" maxLength={4} className="checkout-input" />
                          </div>
                        </div>
                        <div className="checkout-field-group">
                          <label className="checkout-label">Cardholder Name</label>
                          <input type="text" placeholder="Name on card" className="checkout-input" />
                        </div>
                      </div>
                    )}

                    {paymentMethod === "netbanking" && (
                      <div>
                        <div className="upi-section-title">Select Popular Banks</div>
                        <div className="upi-apps-row">
                          <div className="upi-app-badge">HDFC Bank</div>
                          <div className="upi-app-badge">State Bank of India</div>
                          <div className="upi-app-badge">ICICI Bank</div>
                          <div className="upi-app-badge">Axis Bank</div>
                        </div>
                        <div className="checkout-field-group" style={{ marginTop: "14px" }}>
                          <label className="checkout-label">Other Banks</label>
                          <select className="checkout-select">
                            <option>Select another bank</option>
                            <option>Kotak Mahindra Bank</option>
                            <option>Punjab National Bank</option>
                            <option>Bank of Baroda</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "wallets" && (
                      <div>
                        <div className="upi-section-title">Select Wallet</div>
                        <div className="upi-apps-row">
                          <div className="upi-app-badge">Amazon Pay</div>
                          <div className="upi-app-badge">PhonePe Wallet</div>
                          <div className="upi-app-badge">Paytm Wallet</div>
                          <div className="upi-app-badge">MobiKwik</div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "cod" && (
                      <div>
                        <div className="upi-section-title">Cash on Delivery</div>
                        <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                          Pay in cash or through UPI QR code when your package is delivered to your address.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Back to Cart link */}
              <div>
                <Link to="/cart" className="checkout-back-link">
                  <ArrowLeft size={16} />
                  <span>Back to Cart</span>
                </Link>
              </div>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="checkout-right-col">
              {/* Card 1: Order Summary */}
              <div className="checkout-card">
                <div className="summary-top-row">
                  <h2 className="checkout-card-title" style={{ margin: 0 }}>
                    Order Summary
                  </h2>
                  <Link to="/cart" className="summary-edit-cart-link">
                    Edit Cart
                  </Link>
                </div>

                <div className="summary-items-count">
                  {checkoutItems.length} items
                </div>

                {/* Products List */}
                <div className="summary-products-list">
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="summary-product-item">
                      <div className="summary-item-left">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="summary-item-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/products/01.png";
                          }}
                        />
                        <div className="summary-item-meta">
                          <span className="summary-item-title">{item.name}</span>
                          <span className="summary-item-qty">
                            {item.subtitle ? `${item.subtitle} • ` : ""}Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="summary-item-price">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financials */}
                <div className="summary-financial-rows">
                  <div className="summary-fin-row">
                    <span className="summary-fin-label">Subtotal</span>
                    <span className="summary-fin-val">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="summary-fin-row">
                    <span className="summary-fin-label">Shipping</span>
                    <span className={`summary-fin-val ${shippingFee === 0 ? "free" : ""}`}>
                      {shippingFee === 0 ? "FREE" : `₹${shippingFee}`}
                    </span>
                  </div>

                  <div className="summary-fin-row">
                    <span className="summary-fin-label">
                      <span>Discount</span>
                      <Tag size={13} color="#2563eb" />
                    </span>
                    <span className="summary-fin-val">-₹{discount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="summary-fin-row">
                    <span className="summary-fin-label">Tax (18% GST)</span>
                    <span className="summary-fin-val">₹{gstTax.toFixed(2)}</span>
                  </div>

                  <div className="summary-fin-divider" />

                  <div className="summary-total-group">
                    <div>
                      <div className="summary-total-heading">Total Amount</div>
                      <div className="summary-total-sub">(Incl. of all taxes)</div>
                    </div>
                    <div className="summary-total-val">
                      ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Have a coupon code? */}
              <div className="checkout-card">
                <div className="checkout-card-header" style={{ marginBottom: "12px" }}>
                  <h3 className="checkout-card-title" style={{ fontSize: "15px" }}>
                    Have a coupon code?
                  </h3>
                </div>
                <div className="coupon-input-group">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="checkout-input"
                  />
                  <button
                    type="button"
                    className="btn-apply-coupon"
                    onClick={handleApplyCoupon}
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Card 3: Secure Checkout */}
              <div className="checkout-card">
                <div className="secure-card-content">
                  <div className="secure-card-header">
                    <div className="secure-icon-circle">
                      <Lock size={18} />
                    </div>
                    <div className="secure-header-texts">
                      <span className="secure-title">Secure Checkout</span>
                      <span className="secure-desc">
                        Your data is protected with 256-bit SSL encryption.
                      </span>
                    </div>
                  </div>
                  <div className="secure-badges-row">
                    <span className="card-brand-tag">Verified by VISA</span>
                    <span className="card-brand-tag">Mastercard</span>
                    <span className="card-brand-tag">UPI</span>
                    <span className="card-brand-tag">RuPay</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Why Shop With ElectroLab / PrintyNozzle? */}
              <div className="checkout-card">
                <h3 className="why-shop-title">Why Shop With PrintyNozzle?</h3>
                <div className="why-shop-perks">
                  <div className="why-perk-item">
                    <div className="why-perk-icon">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="why-perk-texts">
                      <span className="why-perk-name">Original Products</span>
                      <span className="why-perk-desc">100% authentic and brand new</span>
                    </div>
                  </div>

                  <div className="why-perk-item">
                    <div className="why-perk-icon">
                      <RotateCcw size={18} />
                    </div>
                    <div className="why-perk-texts">
                      <span className="why-perk-name">7 Days Easy Returns</span>
                      <span className="why-perk-desc">Hassle-free return policy</span>
                    </div>
                  </div>

                  <div className="why-perk-item">
                    <div className="why-perk-icon">
                      <Truck size={18} />
                    </div>
                    <div className="why-perk-texts">
                      <span className="why-perk-name">Fast &amp; Safe Delivery</span>
                      <span className="why-perk-desc">Quick delivery across India</span>
                    </div>
                  </div>

                  <div className="why-perk-item">
                    <div className="why-perk-icon">
                      <Headphones size={18} />
                    </div>
                    <div className="why-perk-texts">
                      <span className="why-perk-name">Dedicated Support</span>
                      <span className="why-perk-desc">We're here to help you</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue to Payment / Place Order CTA button */}
              <button type="submit" className="btn-checkout-primary">
                <span>Continue to Payment</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </form>

        {/* ================= BOTTOM FULL-WIDTH TRUST BADGES ================= */}
        <div className="checkout-trust-bar">
          <div className="checkout-trust-item">
            <div className="checkout-trust-icon-box">
              <Truck size={22} />
            </div>
            <div className="checkout-trust-info">
              <span className="checkout-trust-heading">Free Shipping</span>
              <span className="checkout-trust-sub">On orders over ₹999</span>
            </div>
          </div>

          <div className="checkout-trust-item">
            <div className="checkout-trust-icon-box">
              <RotateCcw size={22} />
            </div>
            <div className="checkout-trust-info">
              <span className="checkout-trust-heading">7 Days Returns</span>
              <span className="checkout-trust-sub">Easy return policy</span>
            </div>
          </div>

          <div className="checkout-trust-item">
            <div className="checkout-trust-icon-box">
              <Lock size={22} />
            </div>
            <div className="checkout-trust-info">
              <span className="checkout-trust-heading">Secure Payments</span>
              <span className="checkout-trust-sub">100% safe &amp; secure</span>
            </div>
          </div>

          <div className="checkout-trust-item">
            <div className="checkout-trust-icon-box">
              <Headphones size={22} />
            </div>
            <div className="checkout-trust-info">
              <span className="checkout-trust-heading">24/7 Support</span>
              <span className="checkout-trust-sub">We're here to help</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
