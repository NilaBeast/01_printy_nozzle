import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  X,
  Tag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  ShoppingCart,
  ShoppingBag,
} from "lucide-react";
import "../../public/css/cart.css";
import "../../public/css/skeleton.css";
import cartService from "../services/cart.service";
import useSiteSettings from "../hooks/useSiteSettings";
import { notifyCartChange } from "../utils/cartSync";


export default function Cart() {
  const navigate = useNavigate();
  const { freeShippingThreshold, gstRate } = useSiteSettings();
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessBanner, setShowSuccessBanner] = useState(true);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("printy_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Keep both regular products and custom 3D prints — prints are now
        // orderable through the unified cart/checkout.
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [cartMeta, setCartMeta] = useState(null);

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        return;
      }

      try {
        const response = await cartService.getCart();
        const serverCart = response.data.cart;
        if (!active) return;
        setCartMeta(serverCart);
        setCartItems(
          (serverCart.items || []).map((item) => {
            const isPrint = item.item_type === "print" || item.is_print || item.product_id == null;
            if (isPrint) {
              const material = item.material_name || "3D Print";
              const colorLabel = item.color_name || item.custom_color_hex || "Custom";
              const infill = item.infill_density || 50;
              const finish = item.surface_finish === "smooth" ? "Smooth" : "Standard";
              return {
                id: item.id,
                productId: null,
                name: item.name || (item.file_name ? `3D Print — ${item.file_name}` : "Custom 3D Print"),
                subtitle: item.variant_value || `${material} • ${colorLabel} • ${infill}% • ${finish}`,
                image: item.image || "/images/rocket.png",
                price: Number(item.unit_price ?? item.print_unit_price ?? item.price ?? 0),
                quantity: Number(item.quantity || 1),
                isCustomPrint: true,
                isPrint: true,
                fileName: item.file_name,
                materialName: material,
              };
            }
            return {
              id: item.id,
              productId: item.product_id,
              name: item.name,
              subtitle: item.variant_value || item.category_name || item.slug,
              image: item.image || "/images/products/01.png",
              price: Number(item.unit_price || item.price || 0),
              quantity: Number(item.quantity || 1),
              isCustomPrint: false,
              isPrint: false,
            };
          })
        );
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to load cart");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCart();
    return () => {
      active = false;
    };
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("printy_cart", JSON.stringify(cartItems));
      notifyCartChange();
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Calculations
  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cartItems]);

  const discount = Number(cartMeta?.discount || 0);
  const appliedCoupon = cartMeta?.coupon || null;
  const isFreeShipping = subtotal > 0 && subtotal >= freeShippingThreshold;
  const gstTax = useMemo(() => {
    return cartMeta?.taxAmount ?? +(subtotal * (Number(gstRate || 18) / 100)).toFixed(2);
  }, [cartMeta, subtotal, gstRate]);

  const grandTotal = useMemo(() => {
    return cartMeta?.totalAmount ?? +(subtotal + gstTax - discount).toFixed(2);
  }, [cartMeta, subtotal, gstTax, discount]);

  // Quantity updates
  const handleQuantityChange = async (id, change) => {
    const current = cartItems.find((item) => item.id === id);
    const quantity = Math.max(1, Number(current?.quantity || 1) + change);

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );

    if (localStorage.getItem("token")) {
      try {
        await cartService.updateItem(id, quantity);
        const response = await cartService.getCart();
        setCartMeta(response.data.cart);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to update cart");
      }
    }
  };

  // Remove single item
  const handleRemoveItem = async (id, name) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    try {
      if (localStorage.getItem("token")) {
        await cartService.removeItem(id);
        const response = await cartService.getCart();
        setCartMeta(response.data.cart);
      }
      toast.info(`Removed "${name}" from cart`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to remove item");
    }
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.warn("Please enter a coupon code");
      return;
    }
    if (!localStorage.getItem("token")) {
      toast.info("Please login to apply a coupon");
      navigate("/login", { state: { from: "/cart" } });
      return;
    }
    setCouponBusy(true);
    try {
      const response = await cartService.applyCoupon(code);
      const cartResponse = await cartService.getCart();
      setCartMeta(cartResponse.data.cart);
      setCouponCode("");
      toast.success(response.data.message || `Coupon ${code} applied!`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Invalid coupon code");
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponBusy(true);
    try {
      await cartService.removeCoupon();
      const cartResponse = await cartService.getCart();
      setCartMeta(cartResponse.data.cart);
      toast.success("Coupon removed");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to remove coupon");
    } finally {
      setCouponBusy(false);
    }
  };

  // Clear all items
  const handleClearCart = async () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setCartItems([]);
      try {
        if (localStorage.getItem("token")) {
          await cartService.clear();
        }
        toast.success("Cart cleared");
      } catch (error) {
        toast.error(error?.response?.data?.message || "Unable to clear cart");
      }
    }
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        {/* ================= HEADER WITH CIRCUIT DECORATION ================= */}
        <div className="cart-header-row">
          <div className="cart-header-title-group">
            <h1 className="cart-page-title">Your Cart</h1>
            <div className="cart-breadcrumb">
              <Link to="/">Home</Link>
              <span>&gt;</span>
              <span className="cart-breadcrumb-current">Cart</span>
            </div>
          </div>

          {/* Electronic Circuit Traces + Blue Cart Icon */}
          <div className="cart-circuit-decor" aria-hidden="true">
            <svg
              className="cart-circuit-svg"
              viewBox="0 0 240 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Circuit tracks */}
              <path
                d="M 10 32 L 60 32 L 80 18 L 130 18 L 145 28 L 175 28"
                stroke="#93c5fd"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 35 46 L 90 46 L 110 36 L 165 36"
                stroke="#bfdbfe"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 70 8 L 115 8 L 135 22 L 170 22"
                stroke="#bfdbfe"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Circuit nodes / solder pads */}
              <circle cx="10" cy="32" r="3" fill="#60a5fa" />
              <circle cx="60" cy="32" r="2.5" fill="#93c5fd" />
              <circle cx="35" cy="46" r="3" fill="#60a5fa" />
              <circle cx="70" cy="8" r="2.5" fill="#93c5fd" />
              <circle cx="130" cy="18" r="2.5" fill="#60a5fa" />
              <circle cx="165" cy="36" r="3" fill="#3b82f6" />
            </svg>
            <div
              style={{
                marginLeft: "-18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
              }}
            >
              <ShoppingCart
                size={44}
                color="#2563eb"
                strokeWidth={2.4}
                style={{ filter: "drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2))" }}
              />
            </div>
          </div>
        </div>

        {/* ================= SUCCESS ADDED BANNER ================= */}
        {showSuccessBanner && (
          <div className="cart-success-banner">
            <div className="cart-success-left">
              <span className="cart-check-icon-circle">
                <Check size={14} strokeWidth={3} />
              </span>
              <span>ESP32 DevKit V1 has been added to your cart.</span>
            </div>
            <Link to="/products" className="cart-success-link">
              <span>Continue Shopping</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* ================= SKELETON STATE ================= */}
        {loading ? (
          <div className="cart-layout-grid">
            {/* Left Column Skeleton Table */}
            <div className="cart-items-card">
              <div className="cart-table-header">
                <div className="cart-th-product">PRODUCT</div>
                <div className="cart-th-price">PRICE</div>
                <div className="cart-th-qty">QUANTITY</div>
                <div className="cart-th-total">TOTAL</div>
                <div className="cart-th-action"></div>
              </div>
              <div className="cart-items-list">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton-cart-row">
                    <div className="cart-product-info">
                      <div className="skeleton skeleton-thumb" />
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "65%" }}>
                        <div className="skeleton skeleton-line" style={{ height: "16px", width: "80%" }} />
                        <div className="skeleton skeleton-line" style={{ height: "12px", width: "45%" }} />
                      </div>
                    </div>
                    <div className="skeleton skeleton-line" style={{ height: "16px", width: "60px", margin: "0 auto" }} />
                    <div className="skeleton skeleton-qty-pill" />
                    <div className="skeleton skeleton-line" style={{ height: "16px", width: "70px", margin: "0 auto" }} />
                    <div className="skeleton skeleton-line" style={{ height: "20px", width: "20px", borderRadius: "50%", marginLeft: "auto" }} />
                  </div>
                ))}
              </div>
              <div className="cart-items-footer">
                <div className="skeleton skeleton-line" style={{ height: "36px", width: "120px", borderRadius: "8px" }} />
              </div>
            </div>

            {/* Right Column Skeleton Order Summary */}
            <div className="cart-summary-card">
              <div className="skeleton skeleton-line" style={{ height: "22px", width: "50%", marginBottom: "20px" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="skeleton-summary-row">
                    <div className="skeleton skeleton-line" style={{ height: "14px", width: "35%" }} />
                    <div className="skeleton skeleton-line" style={{ height: "14px", width: "25%" }} />
                  </div>
                ))}
              </div>
              <div className="cart-summary-divider" />
              <div className="skeleton-summary-row" style={{ alignItems: "center", marginBottom: "20px" }}>
                <div className="skeleton skeleton-line" style={{ height: "20px", width: "40%" }} />
                <div className="skeleton skeleton-line" style={{ height: "28px", width: "35%" }} />
              </div>
              <div className="skeleton skeleton-line" style={{ height: "54px", width: "100%", borderRadius: "10px", marginBottom: "20px" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div className="skeleton skeleton-line" style={{ height: "46px", width: "100%", borderRadius: "10px" }} />
                <div className="skeleton skeleton-line" style={{ height: "44px", width: "100%", borderRadius: "10px" }} />
              </div>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          /* ================= EMPTY STATE ================= */
          <div className="cart-empty-state">
            <div className="cart-empty-icon-wrap">
              <ShoppingBag size={38} />
            </div>
            <h2 className="cart-empty-title">Your Cart is Empty</h2>
            <p className="cart-empty-desc">
              Looks like you haven't added any maker tools, development boards, or 3D printing filaments to your cart yet.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <Link to="/products" className="btn-proceed-checkout" style={{ width: "auto", padding: "12px 28px" }}>
                <ShoppingBag size={18} />
                <span>Explore Products</span>
              </Link>
              <Link to="/3d-printing" className="btn-continue-shopping" style={{ padding: "12px 28px" }}>
                Custom 3D Print
              </Link>
            </div>
          </div>
        ) : (
          /* ================= ACTIVE CART 2-COLUMN LAYOUT ================= */
          <div className="cart-layout-grid">
            {/* Left Column: Cart Items Table */}
            <div className="cart-items-card">
              {/* Header row */}
              <div className="cart-table-header">
                <div className="cart-th-product">PRODUCT</div>
                <div className="cart-th-price">PRICE</div>
                <div className="cart-th-qty">QUANTITY</div>
                <div className="cart-th-total">TOTAL</div>
                <div className="cart-th-action"></div>
              </div>

              {/* Items List */}
              <div className="cart-items-list">
                {cartItems.map((item) => {
                  const itemTotal = item.price * item.quantity;
                  return (
                    <div key={item.id} className="cart-item-row">
                      {/* Product Thumbnail & Names */}
                      <div className="cart-product-info">
                        <Link to={item.isCustomPrint ? "/3d-printing" : `/product/${item.productId}`} className="cart-thumb-wrapper">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="cart-thumb-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = item.isCustomPrint ? "/images/rocket.png" : "/images/products/01.png";
                            }}
                          />
                        </Link>
                        <div className="cart-product-details">
                          <Link to={item.isCustomPrint ? "/3d-printing" : `/product/${item.productId}`} className="cart-product-name">
                            {item.name}
                          </Link>
                          <span className="cart-product-sub">{item.subtitle}</span>
                          {item.isCustomPrint && (
                            <span
                              className="cart-coupon-chip"
                              style={{ marginTop: "6px", alignSelf: "flex-start" }}
                            >
                              3D Print • Qty applies to same config
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="cart-item-price">
                        ₹{item.price.toLocaleString("en-IN")}
                      </div>

                      {/* Quantity Controller */}
                      <div className="cart-qty-controller">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="cart-qty-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="cart-item-total">
                        ₹{itemTotal.toLocaleString("en-IN")}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => handleRemoveItem(item.id, item.name)}
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Clear Cart Button */}
              <div className="cart-items-footer">
                <button
                  type="button"
                  className="btn-clear-cart"
                  onClick={handleClearCart}
                >
                  <Trash2 size={16} />
                  <span>Clear Cart</span>
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="cart-summary-card">
              <h2 className="cart-summary-title">Order Summary</h2>

              <div className="cart-summary-breakdown">
                {/* Subtotal */}
                <div className="cart-summary-row">
                  <span className="cart-summary-label">
                    Subtotal ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="cart-summary-val">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Discount */}
                <div className="cart-summary-row">
                  <span className="cart-summary-label">
                    <span>Discount</span>
                    <Tag size={14} color="#2563eb" />
                  </span>
                  <span className="cart-summary-val">-₹{discount.toLocaleString("en-IN")}</span>
                </div>

                {/* Coupon */}
                <div className="cart-summary-row">
                  {appliedCoupon ? (
                    <>
                      <span className="cart-summary-label">
                        <span className="cart-coupon-chip">{appliedCoupon.code}</span>
                      </span>
                      <button
                        type="button"
                        className="cart-coupon-remove"
                        onClick={handleRemoveCoupon}
                        disabled={couponBusy}
                      >
                        <X size={13} /> Remove
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="cart-coupon-form">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        disabled={couponBusy}
                      />
                      <button type="submit" disabled={couponBusy}>
                        {couponBusy ? "..." : "Apply"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Shipping */}
                <div className="cart-summary-row">
                  <span className="cart-summary-label">Shipping</span>
                  {isFreeShipping ? (
                    <span className="cart-summary-val cart-shipping-free">FREE</span>
                  ) : (
                    <span className="cart-summary-val">Calculated at checkout</span>
                  )}
                </div>

                {/* Tax (GST) */}
                <div className="cart-summary-row">
                  <span className="cart-summary-label">Tax ({Number(gstRate || 18)}% GST)</span>
                  <span className="cart-summary-val">₹{gstTax.toFixed(2)}</span>
                </div>
              </div>

              <div className="cart-summary-divider" />

              {/* Total Amount */}
              <div className="cart-summary-total-row">
                <div className="cart-total-title-group">
                  <div className="cart-total-heading">Total Amount</div>
                  <div className="cart-total-subtext">(Incl. of all taxes)</div>
                </div>
                <div className="cart-grand-total-val">
                  ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Free Shipping Alert Box */}
              <div className="cart-promo-banner">
                <div className="cart-promo-icon-wrap">
                  <Truck size={20} />
                </div>
                <div className="cart-promo-text">
                  {isFreeShipping ? (
                    <>
                      <div className="cart-promo-main">
                        Yay! You're eligible for free shipping.
                      </div>
                      <div className="cart-promo-sub">
                        Your order qualifies for FREE standard delivery.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="cart-promo-main">
                        Add ₹{Math.max(0, freeShippingThreshold - subtotal).toLocaleString("en-IN")} more for free shipping.
                      </div>
                      <div className="cart-promo-sub">
                        Free standard delivery on orders over ₹{freeShippingThreshold.toLocaleString("en-IN")}.
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="cart-checkout-actions">
                <button
                  type="button"
                  className="btn-proceed-checkout"
                  onClick={() => navigate("/checkout")}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={18} />
                </button>
                <Link to="/products" className="btn-continue-shopping">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ================= BOTTOM TRUST BADGES ================= */}
        <div className="cart-trust-badges-bar">
          <div className="cart-trust-item">
            <div className="cart-trust-icon">
              <ShieldCheck size={24} />
            </div>
            <div className="cart-trust-content">
              <span className="cart-trust-title">Secure Checkout</span>
              <span className="cart-trust-desc">100% secure payments</span>
            </div>
          </div>

          <div className="cart-trust-item">
            <div className="cart-trust-icon">
              <RotateCcw size={24} />
            </div>
            <div className="cart-trust-content">
              <span className="cart-trust-title">7 Days Returns</span>
              <span className="cart-trust-desc">Hassle-free returns</span>
            </div>
          </div>

          <div className="cart-trust-item">
            <div className="cart-trust-icon">
              <Truck size={24} />
            </div>
            <div className="cart-trust-content">
              <span className="cart-trust-title">Fast Delivery</span>
              <span className="cart-trust-desc">Across India</span>
            </div>
          </div>

          <div className="cart-trust-item">
            <div className="cart-trust-icon">
              <Headphones size={24} />
            </div>
            <div className="cart-trust-content">
              <span className="cart-trust-title">24/7 Support</span>
              <span className="cart-trust-desc">We're here to help</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
