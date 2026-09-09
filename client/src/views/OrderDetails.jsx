import React, { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronRight,
  Box,
  CheckCircle2,
  Check,
  Clock,
  Truck,
  XCircle,
  Download,
  MapPin,
  FileText,
  Headset,
  RefreshCw,
  ShoppingCart,
  ArrowRight
} from "lucide-react";
import { INITIAL_ORDERS } from "./Orders";
import "../../public/css/order-details.css";

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find the exact order from INITIAL_ORDERS by id, fallback to the first order
  const order = useMemo(() => {
    const found = INITIAL_ORDERS.find((o) => o.id === id);
    return found || INITIAL_ORDERS[0];
  }, [id]);

  // Order items mapped with fallbacks
  const items = useMemo(() => {
    return (order.allItems || []).map((item) => ({
      id: item.id,
      name: item.name,
      subtext:
        item.subtext ||
        (order.is3DPrint ? "3D Printing & Fabrication" : "Electronics & Components"),
      image: item.image || "/images/products/01.png",
      price: item.price || 0,
      qty: item.qty || 1
    }));
  }, [order]);

  // Calculated totals directly from items
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [items]);

  const itemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }, [items]);

  const shipping = "FREE";
  const discount = 0;
  const tax = useMemo(() => +(subtotal * 0.18), [subtotal]);
  const total = useMemo(() => +(subtotal + tax - discount), [subtotal, tax, discount]);

  // Parse address details
  const address = useMemo(() => {
    if (typeof order.shippingAddress === "string") {
      const parts = order.shippingAddress.split(", ");
      return {
        name: parts[0] || "Diprati Das",
        line1: parts.slice(1, 3).join(", ") || "123 Maker Street, Koramangala",
        line2: parts.slice(3).join(", ") || "Bengaluru, Karnataka 560034, India",
        phone: "+91 98765 43210"
      };
    }
    return {
      name: "Diprati Das",
      line1: "123, Maker Street, Koramangala",
      line2: "Bengaluru, Karnataka 560034, India",
      phone: "+91 98765 43210"
    };
  }, [order]);

  // Handlers
  const handleDownloadInvoice = () => {
    toast.success(`Downloading tax invoice for Order #${order.id}...`);
  };

  const handleReorder = () => {
    toast.success(`All ${items.length} items from Order #${order.id} added to your cart!`);
    navigate("/cart");
  };

  // Status badge renderer
  const renderStatusBadge = () => {
    switch (order.status) {
      case "Delivered":
        return (
          <span className="od-status-badge delivered">
            <CheckCircle2 size={16} strokeWidth={2.4} />
            <span>Delivered</span>
          </span>
        );
      case "Shipped":
        return (
          <span className="od-status-badge shipped">
            <Truck size={16} strokeWidth={2.4} />
            <span>Shipped</span>
          </span>
        );
      case "Processing":
        return (
          <span className="od-status-badge processing">
            <Box size={16} strokeWidth={2.4} />
            <span>{order.statusText || "In Production"}</span>
          </span>
        );
      case "Cancelled":
        return (
          <span className="od-status-badge cancelled">
            <XCircle size={16} strokeWidth={2.4} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="od-status-badge delivered">
            <CheckCircle2 size={16} strokeWidth={2.4} />
            <span>{order.status}</span>
          </span>
        );
    }
  };

  const trackingSteps = order.trackingSteps || [];

  return (
    <div className="od-page-wrapper">
      <div className="od-container">
        {/* Breadcrumbs */}
        <nav className="od-breadcrumb" aria-label="Breadcrumb">
          <Link to="/" className="od-breadcrumb-link">Home</Link>
          <ChevronRight size={15} className="od-breadcrumb-sep" />
          <Link to="/orders" className="od-breadcrumb-link">My Orders</Link>
          <ChevronRight size={15} className="od-breadcrumb-sep" />
          <span className="od-breadcrumb-current">Order Details</span>
        </nav>

        {/* 2-Column Main Layout Grid */}
        <div className="od-layout-grid">
          {/* Left Column (Main Order Content) */}
          <div className="od-main-column">
            {/* Primary Order Card */}
            <div className="od-card">
              {/* Header */}
              <div className="od-header">
                <div className="od-header-left">
                  <div className="od-header-icon-wrap">
                    <Box size={24} strokeWidth={2.2} />
                  </div>
                  <div className="od-header-info">
                    <h1 className="od-order-number">Order #{order.id}</h1>
                    <p className="od-order-date">
                      Placed on {order.placedDate || `${order.date}, 10:24 AM`}
                    </p>
                  </div>
                </div>
                <div className="od-header-right">
                  {renderStatusBadge()}
                </div>
              </div>

              {/* Stepper / Timeline */}
              {trackingSteps.length > 0 && (
                <div className="od-stepper-wrap">
                  <div className="od-stepper">
                    <div
                      className="od-stepper-track"
                      style={{
                        left: `${100 / (2 * trackingSteps.length)}%`,
                        right: `${100 / (2 * trackingSteps.length)}%`
                      }}
                    ></div>
                    {trackingSteps.map((step, idx) => {
                      let datePart = step.time || "";
                      let timePart = "";
                      if (step.time && step.time.includes(", ")) {
                        const parts = step.time.split(", ");
                        datePart = parts[0];
                        timePart = parts[1];
                      }

                      return (
                        <div
                          key={idx}
                          className={`od-step-item ${step.completed ? "completed" : "pending"}`}
                        >
                          <div
                            className={`od-step-circle ${step.completed ? "completed" : "pending"}`}
                          >
                            {step.completed ? (
                              <Check size={14} strokeWidth={3} />
                            ) : (
                              <Clock size={12} strokeWidth={2.4} />
                            )}
                          </div>
                          <h4 className="od-step-title">{step.title}</h4>
                          <div className="od-step-date-time">
                            <span>{datePart}</span>
                            {timePart && <span>{timePart}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items in Your Order */}
              <div className="od-items-section">
                <h2 className="od-items-title">Items in Your Order</h2>
                <div className="od-table-card">
                  <div className="od-table-head">
                    <div className="od-th od-th-product">Product Details</div>
                    <div className="od-th od-th-price">Price</div>
                    <div className="od-th od-th-qty">Quantity</div>
                    <div className="od-th od-th-total">Total</div>
                  </div>
                  <div className="od-table-body">
                    {items.map((item) => (
                      <div key={item.id} className="od-table-row">
                        <div className="od-td od-td-product od-prod-col">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="od-prod-img"
                          />
                          <div className="od-prod-meta">
                            <h3 className="od-prod-name">{item.name}</h3>
                            <p className="od-prod-sub">{item.subtext}</p>
                          </div>
                        </div>
                        <div className="od-td od-td-price">
                          ₹{item.price.toLocaleString("en-IN")}
                        </div>
                        <div className="od-td od-td-qty">{item.qty}</div>
                        <div className="od-td od-td-total">
                          ₹{(item.price * item.qty).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Footer Info Bar */}
              <div className="od-order-info-footer">
                <div className="od-info-col">
                  <span className="od-info-lbl">Order Placed</span>
                  <span className="od-info-val">
                    {order.placedDate || `${order.date}, 10:24 AM`}
                  </span>
                </div>
                <div className="od-info-col">
                  <span className="od-info-lbl">Order ID</span>
                  <span className="od-info-val">#{order.id}</span>
                </div>
                <div className="od-info-col">
                  <span className="od-info-lbl">Payment Method</span>
                  <span className="od-info-val">
                    {order.paymentMethod || "UPI (Google Pay)"}
                  </span>
                </div>
                <div className="od-info-col" style={{ alignItems: "flex-end" }}>
                  <button
                    type="button"
                    className="od-info-invoice-btn"
                    onClick={handleDownloadInvoice}
                  >
                    <span>View Invoice</span>
                    <Download size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            </div>

            {/* Side-by-side Address Cards */}
            <div className="od-addresses-grid">
              {/* Shipping Address */}
              <div className="od-card od-address-card">
                <div className="od-address-header">
                  <MapPin size={20} strokeWidth={2.2} className="od-address-icon" />
                  <h3 className="od-address-title">Shipping Address</h3>
                </div>
                <div className="od-address-body">
                  <p className="od-address-name">{address.name}</p>
                  <p className="od-address-line">{address.line1}</p>
                  <p className="od-address-line">{address.line2}</p>
                  <p className="od-address-phone">{address.phone}</p>
                </div>
              </div>

              {/* Billing Address */}
              <div className="od-card od-address-card">
                <div className="od-address-header">
                  <FileText size={20} strokeWidth={2.2} className="od-address-icon" />
                  <h3 className="od-address-title">Billing Address</h3>
                </div>
                <div className="od-address-body">
                  <p className="od-address-name">{address.name}</p>
                  <p className="od-address-line">{address.line1}</p>
                  <p className="od-address-line">{address.line2}</p>
                  <p className="od-address-phone">{address.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <aside className="od-sidebar">
            {/* Order Summary Card */}
            <div className="od-card od-summary-card">
              <h3 className="od-summary-title">Order Summary</h3>

              <div className="od-summary-rows">
                <div className="od-summary-row">
                  <span className="od-sum-lbl">
                    Subtotal ({itemsCount} {itemsCount === 1 ? "item" : "items"})
                  </span>
                  <span className="od-sum-val">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="od-summary-row">
                  <span className="od-sum-lbl">Shipping</span>
                  <span className="od-sum-val od-sum-val-free">
                    {shipping}
                  </span>
                </div>
                <div className="od-summary-row">
                  <span className="od-sum-lbl">Discount</span>
                  <span className="od-sum-val">-₹{discount}</span>
                </div>
                <div className="od-summary-row">
                  <span className="od-sum-lbl">Tax (18% GST)</span>
                  <span className="od-sum-val">
                    ₹{tax.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="od-summary-divider"></div>

              <div className="od-summary-total-row">
                <div className="od-total-labels">
                  <span className="od-total-title">Total Amount</span>
                  <span className="od-total-sub">(Incl. of all taxes)</span>
                </div>
                <span className="od-total-amount">
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="od-card od-action-card">
              <div className="od-action-top">
                <Headset size={32} strokeWidth={2.1} className="od-action-icon" />
                <div className="od-action-text">
                  <h4 className="od-action-title">Need Help?</h4>
                  <p className="od-action-desc">
                    Have questions about your order?
                    <br />
                    Our support team is here to help.
                  </p>
                </div>
              </div>
              <Link to="/contact" className="od-action-btn-outline">
                Contact Support
              </Link>
            </div>

            {/* Download Invoice Card */}
            <div className="od-card od-action-card">
              <div className="od-action-top">
                <FileText size={28} strokeWidth={2.1} className="od-action-icon" />
                <div className="od-action-text">
                  <h4 className="od-action-title">Download Invoice</h4>
                  <p className="od-action-desc">
                    Get a detailed invoice for your order.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="od-action-btn-outline"
                onClick={handleDownloadInvoice}
              >
                <Download size={16} strokeWidth={2.2} />
                <span>Download Invoice</span>
              </button>
            </div>

            {/* Reorder Card */}
            <div className="od-card od-action-card">
              <div className="od-action-top">
                <RefreshCw size={28} strokeWidth={2.1} className="od-action-icon" />
                <div className="od-action-text">
                  <h4 className="od-action-title">Reorder</h4>
                  <p className="od-action-desc">
                    Want to buy these items again?
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="od-action-btn-outline"
                onClick={handleReorder}
              >
                <ShoppingCart size={16} strokeWidth={2.2} />
                <span>Add All to Cart</span>
              </button>
            </div>

            {/* Explore 3D Printing Promo Card */}
            <div className="od-card od-promo-card">
              <div className="od-promo-left">
                <div className="od-promo-head">
                  <Box size={22} strokeWidth={2.2} className="od-promo-icon" />
                  <h4 className="od-promo-title">Explore 3D Printing</h4>
                </div>
                <p className="od-promo-desc">
                  Turn your ideas into reality with high-quality 3D prints.
                </p>
                <Link to="/products" className="od-promo-btn">
                  <span>Visit 3D Printing</span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </Link>
              </div>
              <div className="od-promo-right">
                <img
                  src="/images/My_ORDERS_PAGE_BOTTLE_TRANSPARENT.png"
                  alt="3D Printed Vase"
                  className="od-promo-vase"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
