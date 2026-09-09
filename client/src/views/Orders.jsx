import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  User,
  ShoppingBag,
  MapPin,
  Box,
  LogOut,
  Search,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Headphones,
  Headset,
  RotateCcw,
  FileText,
  FileDown,
  RefreshCw,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Download,
  AlertCircle,
  Package
} from "lucide-react";
import "../../public/css/orders.css";

// Sample order data using existing products & custom 3D prints
export const INITIAL_ORDERS = [
  {
    id: "EL12456",
    date: "12 Aug 2024",
    placedDate: "12 Aug 2024, 10:24 AM",
    status: "Delivered",
    statusDate: "Delivered on 16 Aug 2024",
    totalPrice: 1246,
    itemCountText: "4 items",
    itemsSummary: "ESP32 DevKit V1, PLA Filament (Red), Precision Screwdriver Set, Jumper Wires",
    is3DPrint: false,
    shippingAddress: "Diprati Das, 123 Maker Street, Koramangala, Bengaluru, Karnataka 560034",
    paymentMethod: "UPI (Google Pay)",
    thumbnails: [
      { id: 1, name: "ESP32 DevKit V1", image: "/images/products/01.png", price: 499, qty: 1 },
      { id: 2, name: "PLA Filament (Red)", image: "/images/products/05.png", price: 349, qty: 1 },
      { id: 3, name: "Precision Screwdriver Set", image: "/images/products/screwdriver_set.png", price: 299, qty: 1 },
    ],
    overflowCount: 1,
    allItems: [
      { id: 1, name: "ESP32 DevKit V1", subtext: "Microcontrollers | Black", image: "/images/products/01.png", price: 499, qty: 1 },
      { id: 2, name: "PLA Filament (Red)", subtext: "3D Printing | 1.75mm 1kg", image: "/images/products/05.png", price: 349, qty: 1 },
      { id: 3, name: "Precision Screwdriver Set", subtext: "25 in 1 Multi-bit Kit", image: "/images/products/screwdriver_set.png", price: 299, qty: 1 },
      { id: 4, name: "Premium Jumper Wires (40 pcs)", subtext: "Male to Female | 20cm", image: "/images/products/12.png", price: 99, qty: 1 },
    ],
    trackingSteps: [
      { title: "Order Placed", time: "12 Aug 2024, 10:24 AM", completed: true, desc: "Your order has been placed successfully." },
      { title: "Packed", time: "13 Aug 2024, 02:15 PM", completed: true, desc: "Carrier: BlueDart Express (AWB: BLR982131)" },
      { title: "Shipped", time: "14 Aug 2024, 11:32 AM", completed: true, desc: "In transit to nearest distribution facility." },
      { title: "Out for Delivery", time: "15 Aug 2024, 09:10 AM", completed: true, desc: "Courier partner is out for delivery." },
      { title: "Delivered", time: "16 Aug 2024, 04:32 PM", completed: true, desc: "Package handed over to customer." },
    ]
  },
  {
    id: "EL12412",
    date: "03 Aug 2024",
    placedDate: "03 Aug 2024, 02:15 PM",
    status: "Processing",
    statusText: "In Production",
    statusDate: "Expected by 07 Aug 2024",
    totalPrice: 799,
    itemCountText: "3D Printing Order",
    itemsSummary: "Custom 3D Print (STL File)",
    specsText: "Material: PLA  |  Color: White  |  Qty: 2",
    is3DPrint: true,
    shippingAddress: "Diprati Das, 123 Maker Street, Koramangala, Bengaluru, Karnataka 560034",
    paymentMethod: "Credit Card (Mastercard **** 4012)",
    thumbnails: [
      { id: 10, name: "3D Custom Bust", image: "/images/products/20.png", price: 399, qty: 1 },
      { id: 11, name: "White PLA Spool", image: "/images/products/blue_filament.png", price: 250, qty: 1 },
      { id: 12, name: "Brass Nozzle 0.4mm", image: "/images/products/17.png", price: 150, qty: 1 },
    ],
    overflowCount: 2,
    allItems: [
      { id: 10, name: "Custom 3D Print - White Vase STL", subtext: "Material: PLA | Color: White", image: "/images/products/20.png", price: 499, qty: 1 },
      { id: 11, name: "White PLA Filament 1kg", subtext: "1.75mm Spool", image: "/images/products/blue_filament.png", price: 200, qty: 1 },
      { id: 12, name: "Precision 0.4mm Brass Extruder Nozzle", subtext: "3D Printer Spare Part", image: "/images/products/17.png", price: 100, qty: 1 },
    ],
    trackingSteps: [
      { title: "Order Confirmed", time: "03 Aug 2024, 02:15 PM", completed: true, desc: "STL file verified and sliced." },
      { title: "In Production", time: "04 Aug 2024, 08:00 AM", completed: true, current: true, desc: "Printing on Bambu Lab X1-Carbon (Layer 420/680)." },
      { title: "Quality Check", time: "06 Aug 2024, 11:00 AM", completed: false, desc: "Dimensional accuracy verification." },
      { title: "Out for Delivery", time: "Pending", completed: false, desc: "Dispatched to courier partner." },
      { title: "Delivered", time: "Expected 07 Aug", completed: false, desc: "Standard courier delivery." },
    ]
  },
  {
    id: "EL12378",
    date: "28 Jul 2024",
    placedDate: "28 Jul 2024, 06:20 PM",
    status: "Shipped",
    statusDate: "Expected by 01 Aug 2024",
    totalPrice: 1099,
    itemCountText: "4 items",
    itemsSummary: "Arduino UNO R3, HC-SR04 Sensor, Breadboard, LED Kit",
    is3DPrint: false,
    shippingAddress: "Diprati Das, XYZ Tech Park, Outer Ring Road, Bellandur, Bengaluru 560103",
    paymentMethod: "UPI (PhonePe)",
    thumbnails: [
      { id: 20, name: "Arduino UNO R3", image: "/images/products/13.png", price: 649, qty: 1 },
      { id: 21, name: "HC-SR04 Ultrasonic Sensor", image: "/images/products/14.png", price: 149, qty: 1 },
      { id: 22, name: "830 Point Breadboard", image: "/images/products/15.png", price: 180, qty: 1 },
    ],
    overflowCount: 1,
    allItems: [
      { id: 20, name: "Arduino UNO R3 Original", subtext: "Microcontrollers | ATmega328P", image: "/images/products/13.png", price: 649, qty: 1 },
      { id: 21, name: "HC-SR04 Ultrasonic Sensor Module", subtext: "Modules & Sensors | 5V", image: "/images/products/14.png", price: 149, qty: 1 },
      { id: 22, name: "830 Point Solderless Breadboard", subtext: "Prototyping & Accessories", image: "/images/products/15.png", price: 180, qty: 1 },
      { id: 23, name: "Assorted LED Prototyping Kit (50 pcs)", subtext: "5mm LEDs | Multi-color", image: "/images/products/02.png", price: 121, qty: 1 },
    ],
    trackingSteps: [
      { title: "Order Confirmed", time: "28 Jul 2024, 06:20 PM", completed: true, desc: "Payment verified successfully." },
      { title: "Packed & Ready", time: "29 Jul 2024, 11:00 AM", completed: true, desc: "Package sealed at Bengaluru Fulfillment Center." },
      { title: "Shipped", time: "30 Jul 2024, 02:30 PM", completed: true, current: true, desc: "In transit via Delhivery Express (AWB: DEL78201)" },
      { title: "Out for Delivery", time: "Pending", completed: false, desc: "Arrived at local hub." },
      { title: "Delivered", time: "Expected 01 Aug", completed: false, desc: "Out for final delivery." },
    ]
  },
  {
    id: "EL12310",
    date: "12 Jul 2024",
    placedDate: "12 Jul 2024, 09:12 AM",
    status: "Delivered",
    statusDate: "Delivered on 15 Jul 2024",
    totalPrice: 650,
    itemCountText: "3D Printing Order",
    itemsSummary: "Custom 3D Print (STL File)",
    specsText: "Material: PETG  |  Color: Black  |  Qty: 1",
    is3DPrint: true,
    shippingAddress: "Diprati Das, 123 Maker Street, Koramangala, Bengaluru, Karnataka 560034",
    paymentMethod: "Net Banking (HDFC)",
    thumbnails: [
      { id: 30, name: "Black Spool", image: "/images/products/blue_filament.png", price: 350, qty: 1 },
      { id: 31, name: "Bracket Mount", image: "/images/products/16.png", price: 180, qty: 1 },
      { id: 32, name: "Printed Figurine", image: "/images/products/21.png", price: 120, qty: 1 },
    ],
    overflowCount: 0,
    allItems: [
      { id: 30, name: "Custom PETG Industrial Bracket", subtext: "Material: PETG | Color: Black", image: "/images/products/blue_filament.png", price: 350, qty: 1 },
      { id: 31, name: "MPU6050 Motion Sensor", subtext: "6-Axis Gyroscope & Accelerometer", image: "/images/products/16.png", price: 180, qty: 1 },
      { id: 32, name: "Calibration Cube Sample", subtext: "20mm Test Print", image: "/images/products/21.png", price: 120, qty: 1 },
    ],
    trackingSteps: [
      { title: "Order Confirmed", time: "12 Jul 2024, 09:12 AM", completed: true, desc: "3D Print job scheduled." },
      { title: "Production Finished", time: "13 Jul 2024, 03:00 PM", completed: true, desc: "PETG print inspected and packaged." },
      { title: "Shipped", time: "14 Jul 2024, 10:00 AM", completed: true, desc: "Dispatched with Shadowfax courier." },
      { title: "Out for Delivery", time: "15 Jul 2024, 08:30 AM", completed: true, desc: "Courier partner out for delivery." },
      { title: "Delivered", time: "15 Jul 2024, 01:15 PM", completed: true, desc: "Signed and delivered to Diprati Das." },
    ]
  },
  {
    id: "EL12298",
    date: "05 Jul 2024",
    placedDate: "05 Jul 2024, 04:40 PM",
    status: "Cancelled",
    statusDate: "Cancelled on 06 Jul 2024",
    totalPrice: 420,
    itemCountText: "3 items",
    itemsSummary: "Soldering Iron Kit, Wire Cutter, Solder Wire",
    is3DPrint: false,
    shippingAddress: "Diprati Das, 123 Maker Street, Koramangala, Bengaluru, Karnataka 560034",
    paymentMethod: "UPI (Google Pay) - Refunded",
    thumbnails: [
      { id: 40, name: "Soldering Iron", image: "/images/products/05.png", price: 220, qty: 1 },
      { id: 41, name: "Wire Cutter", image: "/images/products/screwdriver_set.png", price: 110, qty: 1 },
      { id: 42, name: "Solder Wire", image: "/images/products/18.png", price: 90, qty: 1 },
    ],
    overflowCount: 0,
    allItems: [
      { id: 40, name: "60W Adjustable Temp Soldering Iron", subtext: "Tools & Equipment | 220V", image: "/images/products/05.png", price: 220, qty: 1 },
      { id: 41, name: "Precision Flush Wire Cutters", subtext: "Hand Tools | 5-inch", image: "/images/products/screwdriver_set.png", price: 110, qty: 1 },
      { id: 42, name: "Lead-Free Rosin Core Solder Wire", subtext: "50g Spool | 0.8mm", image: "/images/products/18.png", price: 90, qty: 1 },
    ],
    trackingSteps: [
      { title: "Order Placed", time: "05 Jul 2024, 04:40 PM", completed: true, desc: "Order received." },
      { title: "Cancellation Requested", time: "06 Jul 2024, 09:15 AM", completed: true, desc: "Cancelled by user before dispatch." },
      { title: "Refund Issued", time: "06 Jul 2024, 11:30 AM", completed: true, desc: "₹420 refunded back to source account." },
    ]
  }
];

function Orders() {
  const navigate = useNavigate();

  // User details
  const user = {
    name: "Diprati Das",
    email: "diprati@example.com",
    initials: "DD",
  };

  // State management
  const [activeTab, setActiveTab] = useState("All Orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("Last 6 Months");
  const [orders] = useState(INITIAL_ORDERS);

  // Modals state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [show3DModal, setShow3DModal] = useState(false);

  // Handlers
  const handleLogout = () => {
    toast.info("You have logged out successfully.");
  };

  const handleBuyAgain = (order) => {
    toast.success(`Items from Order #${order.id} added to your cart!`);
  };

  const handleDownloadInvoice = (orderId) => {
    toast.success(`Downloading tax invoice for Order #${orderId}...`);
  };

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "Processing" && order.status !== "Processing") return false;
      if (activeTab === "Shipped" && order.status !== "Shipped") return false;
      if (activeTab === "Delivered" && order.status !== "Delivered") return false;
      if (activeTab === "Cancelled" && order.status !== "Cancelled") return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesSummary = order.itemsSummary.toLowerCase().includes(query);
        const matchesItems = order.allItems.some((item) =>
          item.name.toLowerCase().includes(query)
        );
        if (!matchesId && !matchesSummary && !matchesItems) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      processing: orders.filter((o) => o.status === "Processing").length,
      shipped: orders.filter((o) => o.status === "Shipped").length,
      delivered: orders.filter((o) => o.status === "Delivered").length,
      cancelled: orders.filter((o) => o.status === "Cancelled").length,
    };
  }, [orders]);

  return (
    <div className="orders-page-wrapper">
      <div className="orders-container">
        <div className="orders-main-grid">
          {/* =====================================================
              LEFT SIDEBAR
              Strictly contains:
              1. My Profile
              2. My Orders (active)
              3. Addresses
              4. 3D Print Files
              5. Logout
              ===================================================== */}
          {/* =====================================================
              LEFT SIDEBAR
              Strictly contains (single unified card matching design):
              1. User Profile Header (Avatar DD, Name, Email, Edit Profile)
              2. My Profile
              3. My Orders (active)
              4. Addresses (navigates to /profile#addresses and scrolls to address section)
              5. 3D Print Files
              --- Divider ---
              6. Logout
              ===================================================== */}
          <aside className="orders-sidebar">
            <div className="orders-sidebar-card">
              {/* User Profile Header */}
              <div className="orders-user-profile-header">
                <div className="orders-user-avatar">{user.initials}</div>
                <div className="orders-user-info">
                  <span className="orders-user-name">{user.name}</span>
                  <span className="orders-user-email">{user.email}</span>
                  <Link to="/profile" className="orders-edit-profile-link">
                    Edit Profile
                  </Link>
                </div>
              </div>

              {/* Navigation Menu */}
              <ul className="orders-nav-menu">
                <li className="orders-nav-item">
                  <Link to="/profile" className="orders-nav-link">
                    <span className="orders-nav-icon">
                      <User size={18} />
                    </span>
                    <span>My Profile</span>
                  </Link>
                </li>

                <li className="orders-nav-item">
                  <Link to="/orders" className="orders-nav-link active">
                    <span className="orders-nav-icon">
                      <ShoppingBag size={18} />
                    </span>
                    <span>My Orders</span>
                  </Link>
                </li>

                <li className="orders-nav-item">
                  <Link
                    to="/profile#addresses"
                    state={{ scrollTo: "addresses" }}
                    className="orders-nav-link"
                  >
                    <span className="orders-nav-icon">
                      <MapPin size={18} />
                    </span>
                    <span>Addresses</span>
                  </Link>
                </li>

                <li className="orders-nav-item">
                  <button
                    type="button"
                    className="orders-nav-link"
                    onClick={() => setShow3DModal(true)}
                  >
                    <span className="orders-nav-icon">
                      <Box size={18} />
                    </span>
                    <span>3D Print Files</span>
                  </button>
                </li>

                <li className="orders-nav-divider-item" role="separator">
                  <div className="orders-nav-divider" />
                </li>

                <li className="orders-nav-item">
                  <button
                    type="button"
                    className="orders-nav-link logout-btn"
                    onClick={handleLogout}
                  >
                    <span className="orders-nav-icon">
                      <LogOut size={18} />
                    </span>
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          {/* =====================================================
              TOP HEADER (Spans Columns 2 & 3 above Right Sidebar)
              - "My Orders" + Subtitle on the left
              - Large gap in the middle
              - Search + "Last 6 Months" on the right, directly above "Need Help?"
              ===================================================== */}
          <div className="orders-top-header">
            <div className="orders-title-text">
              <h1>My Orders</h1>
              <p>Track, view and manage all your orders in one place.</p>
            </div>

            <div className="orders-controls-group">
              {/* Search Input */}
              <div className="orders-search-wrapper">
                <input
                  type="text"
                  className="orders-search-input"
                  placeholder="Search by order ID, product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="orders-search-clear"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <Search size={16} className="orders-search-icon" />
                )}
              </div>

              {/* Time Range Dropdown (Positioned directly above Need Help?) */}
              <div className="orders-time-select-wrapper">
                <select
                  className="orders-time-select"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="Last 6 Months">Last 6 Months</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="All Time">All Time</option>
                </select>
                <ChevronDown size={14} className="orders-select-chevron" />
              </div>
            </div>
          </div>

          {/* =====================================================
              MIDDLE CONTENT (MY ORDERS FEED)
              ===================================================== */}
          <main className="orders-content">
            {/* Filter Tabs */}
            <div className="orders-tabs-bar">
              {[
                { key: "All Orders", label: "All Orders" },
                { key: "Processing", label: "Processing" },
                { key: "Shipped", label: "Shipped" },
                { key: "Delivered", label: "Delivered" },
                { key: "Cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`orders-tab-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders Feed Cards */}
            <div className="orders-list">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const statusClass =
                    order.status === "Delivered"
                      ? "delivered"
                      : order.status === "Processing"
                        ? "in-production"
                        : order.status === "Shipped"
                          ? "shipped"
                          : "cancelled";

                  return (
                    <div className="order-card" key={order.id}>
                      {/* Top Bar: Order # and Date */}
                      <div className="order-card-header">
                        <div className="order-header-left">
                          <span className="order-id-label">Order #{order.id}</span>
                          <span className="order-date-label">{order.date}</span>
                        </div>
                      </div>

                      {/* Card Content Grid */}
                      <div className="order-card-body">
                        {/* Thumbnails + Description */}
                        <div className="order-products-preview">
                          <div className="order-thumbnails-strip">
                            {order.thumbnails.map((item, idx) => (
                              <div
                                className="order-thumb-box"
                                key={idx}
                                title={item.name}
                              >
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/products/01.png";
                                  }}
                                />
                              </div>
                            ))}
                            {order.overflowCount > 0 && (
                              <div className="order-thumb-overflow">
                                +{order.overflowCount}
                              </div>
                            )}
                          </div>

                          <div className="order-summary-meta">
                            {order.is3DPrint ? (
                              <>
                                <span className="order-items-count">
                                  3D Printing Order
                                </span>
                                <span className="order-products-text">
                                  {order.itemsSummary}
                                </span>
                                {order.specsText && (
                                  <span className="order-specs-text">
                                    {order.specsText}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="order-items-count">
                                  {order.itemCountText}
                                </span>
                                <span className="order-products-text">
                                  {order.itemsSummary}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Column */}
                        <div className="order-status-col">
                          <span className={`order-status-badge ${statusClass}`}>
                            {order.status === "Delivered" && <CheckCircle2 size={15} />}
                            {order.status === "Processing" && <Box size={15} />}
                            {order.status === "Shipped" && <Truck size={15} />}
                            {order.status === "Cancelled" && <XCircle size={15} />}
                            <span>{order.statusText || order.status}</span>
                          </span>
                          <span className="order-status-date">
                            {order.statusDate}
                          </span>
                        </div>

                        {/* Price & Action Buttons */}
                        <div className="order-actions-col">
                          <span className="order-price-val">
                            ₹{order.totalPrice.toLocaleString("en-IN")}
                          </span>

                          <div className="order-buttons-group">
                            {order.status === "Shipped" && (
                              <button
                                type="button"
                                className="order-btn-outline"
                                onClick={() => setSelectedTrackingOrder(order)}
                              >
                                Track Order
                              </button>
                            )}

                            <button
                              type="button"
                              className="order-btn-outline"
                              onClick={() => navigate(`/orders/${order.id}`)}
                            >
                              View Details
                            </button>

                            {order.status === "Delivered" && (
                              <button
                                type="button"
                                className="order-btn-primary"
                                onClick={() => handleBuyAgain(order)}
                              >
                                Buy Again
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="orders-empty-state">
                  <div className="orders-empty-icon">
                    <Package size={32} />
                  </div>
                  <h3>No Orders Found</h3>
                  <p>
                    {searchQuery
                      ? `No orders matching "${searchQuery}". Try another keyword or clear search.`
                      : `You don't have any orders in "${activeTab}".`}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      className="order-btn-outline"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
          </main>

          {/* =====================================================
              RIGHT SIDEBAR
              Need Help? + Quick Actions + 3D Bottle Promo Card
              ===================================================== */}
          <aside className="orders-right-aside">
            {/* Need Help Card */}
            <div className="orders-aside-card orders-help-card">
              <div className="orders-help-top">
                <Headset size={36} strokeWidth={2.2} className="orders-help-icon" />
                <div className="orders-help-text">
                  <h3 className="orders-help-title">Need Help?</h3>
                  <p className="orders-help-desc">
                    Have questions about your order? Our support team is here to help.
                  </p>
                </div>
              </div>
              <Link to="/contact" className="orders-help-btn">
                Contact Support
              </Link>
            </div>

            {/* Quick Actions Card */}
            <div className="orders-aside-card orders-quick-card">
              <h3 className="orders-quick-title">Quick Actions</h3>
              <ul className="orders-quick-list">
                <li>
                  <button
                    type="button"
                    className="orders-quick-item-btn"
                    onClick={() => {
                      if (orders.find((o) => o.status === "Shipped")) {
                        setSelectedTrackingOrder(
                          orders.find((o) => o.status === "Shipped")
                        );
                      } else {
                        setSelectedTrackingOrder(orders[0]);
                      }
                    }}
                  >
                    <span className="orders-quick-icon">
                      <Truck size={22} strokeWidth={2.1} />
                    </span>
                    <span className="orders-quick-text">Track an Order</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="orders-quick-item-btn"
                    onClick={() => toast.info("Return / Replacement portal will open soon.")}
                  >
                    <span className="orders-quick-icon">
                      <RefreshCw size={21} strokeWidth={2.1} />
                    </span>
                    <span className="orders-quick-text">Return or Replace</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="orders-quick-item-btn"
                    onClick={() => handleDownloadInvoice(orders[0].id)}
                  >
                    <span className="orders-quick-icon">
                      <FileDown size={22} strokeWidth={2.1} />
                    </span>
                    <span className="orders-quick-text">Download Invoice</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="orders-quick-item-btn"
                    onClick={() => setShow3DModal(true)}
                  >
                    <span className="orders-quick-icon">
                      <Box size={22} strokeWidth={2.1} />
                    </span>
                    <span className="orders-quick-text">View 3D Print Files</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="orders-quick-item-btn"
                    onClick={() => setShowAddressModal(true)}
                  >
                    <span className="orders-quick-icon">
                      <MapPin size={22} strokeWidth={2.1} />
                    </span>
                    <span className="orders-quick-text">Manage Addresses</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* 3D Print Promo Card with Blue Bottle Visual */}
            <div className="orders-promo-card">
              <div className="orders-promo-top">
                <div className="orders-promo-image-wrap">
                  <img
                    src="/images/My_ORDERS_PAGE_BOTTLE_IMAGE.png"
                    alt="3D Printed Vase"
                    className="orders-promo-image"
                  />
                </div>
                <div className="orders-promo-content">
                  <h3 className="orders-promo-title">Bring Your Ideas to Life</h3>
                  <p className="orders-promo-desc">
                    Upload your 3D models and get high-quality prints delivered to your door.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="orders-promo-btn"
                onClick={() => {
                  toast.success("Ready to create! Redirecting to 3D Print customizer...");
                }}
              >
                Start a 3D Print Order
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================================
          ORDER DETAILS MODAL
          ===================================================== */}
      {selectedOrderDetails && (
        <div
          className="orders-modal-backdrop"
          onClick={() => setSelectedOrderDetails(null)}
        >
          <div
            className="orders-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-header">
              <div>
                <h3>Order #{selectedOrderDetails.id}</h3>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Placed on {selectedOrderDetails.date}
                </span>
              </div>
              <button
                className="orders-modal-close-btn"
                onClick={() => setSelectedOrderDetails(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="orders-modal-body">
              {/* Shipping & Payment summary */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <strong style={{ display: "block", color: "#0f172a", marginBottom: 3 }}>
                    Delivery Address:
                  </strong>
                  <span style={{ color: "#475569" }}>
                    {selectedOrderDetails.shippingAddress}
                  </span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "#0f172a", marginBottom: 3 }}>
                    Payment Method:
                  </strong>
                  <span style={{ color: "#475569" }}>
                    {selectedOrderDetails.paymentMethod}
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        fontSize: "0.76rem",
                        padding: "2px 8px",
                        background: "#dcfce7",
                        color: "#166534",
                        borderRadius: "10px",
                        fontWeight: 600,
                      }}
                    >
                      Payment Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Items list */}
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "0.92rem",
                    color: "#0f172a",
                    marginBottom: 8,
                  }}
                >
                  Items in this Order ({selectedOrderDetails.allItems.length}):
                </strong>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {selectedOrderDetails.allItems.map((item, idx) => (
                    <div className="orders-modal-item-row" key={idx}>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="orders-modal-item-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/products/01.png";
                        }}
                      />
                      <div className="orders-modal-item-info">
                        <div className="orders-modal-item-name">{item.name}</div>
                        <div className="orders-modal-item-qty">
                          Quantity: {item.qty}
                        </div>
                      </div>
                      <div className="orders-modal-item-price">
                        ₹{item.price.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: "0.88rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Item Subtotal</span>
                  <span>₹{selectedOrderDetails.totalPrice.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Shipping & Handling</span>
                  <span style={{ color: "#10b981", fontWeight: 600 }}>FREE</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    color: "#0f172a",
                    borderTop: "1px solid #f1f5f9",
                    paddingTop: 8,
                    marginTop: 4,
                  }}
                >
                  <span>Grand Total</span>
                  <span>₹{selectedOrderDetails.totalPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="orders-modal-footer">
              <button
                type="button"
                className="order-btn-outline"
                onClick={() => handleDownloadInvoice(selectedOrderDetails.id)}
              >
                <Download size={14} style={{ marginRight: 6 }} />
                Invoice
              </button>
              <button
                type="button"
                className="order-btn-primary"
                onClick={() => {
                  setSelectedTrackingOrder(selectedOrderDetails);
                  setSelectedOrderDetails(null);
                }}
              >
                Track Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TRACK ORDER MODAL
          ===================================================== */}
      {selectedTrackingOrder && (
        <div
          className="orders-modal-backdrop"
          onClick={() => setSelectedTrackingOrder(null)}
        >
          <div
            className="orders-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-header">
              <div>
                <h3>Tracking Order #{selectedTrackingOrder.id}</h3>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Status: {selectedTrackingOrder.statusText || selectedTrackingOrder.status}
                </span>
              </div>
              <button
                className="orders-modal-close-btn"
                onClick={() => setSelectedTrackingOrder(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="orders-modal-body">
              <div className="tracking-stepper">
                {selectedTrackingOrder.trackingSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`tracking-step ${step.completed ? "completed" : ""
                      } ${step.current ? "current" : ""}`}
                  >
                    <div className="tracking-step-dot">
                      {step.completed ? "✓" : idx + 1}
                    </div>
                    <div className="tracking-step-content">
                      <span className="tracking-step-title">{step.title}</span>
                      <span className="tracking-step-time">{step.time}</span>
                      <span className="tracking-step-desc">{step.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="orders-modal-footer">
              <button
                type="button"
                className="order-btn-outline"
                onClick={() => setSelectedTrackingOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="order-btn-primary"
                onClick={() => {
                  toast.success("SMS & Email live updates enabled!");
                  setSelectedTrackingOrder(null);
                }}
              >
                Subscribe for Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADDRESSES MODAL (FOR SIDEBAR / QUICK ACTION)
          ===================================================== */}
      {showAddressModal && (
        <div
          className="orders-modal-backdrop"
          onClick={() => setShowAddressModal(false)}
        >
          <div
            className="orders-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-header">
              <h3>Saved Delivery Addresses</h3>
              <button
                className="orders-modal-close-btn"
                onClick={() => setShowAddressModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="orders-modal-body">
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>Home (Default)</strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "#dbeafe",
                      color: "#1e40af",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 600,
                    }}
                  >
                    Default
                  </span>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#475569" }}>
                  Diprati Das — +91 98765 43210
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  123, Maker Street, Koramangala, Bengaluru, Karnataka 560034
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ color: "#0f172a" }}>Office</strong>
                </div>
                <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#475569" }}>
                  Diprati Das — +91 98765 43210
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  XYZ Tech Park, 5th Floor, Outer Ring Road, Bellandur, Bengaluru 560103
                </p>
              </div>
            </div>
            <div className="orders-modal-footer">
              <button
                type="button"
                className="order-btn-outline"
                onClick={() => {
                  setShowAddressModal(false);
                  navigate("/profile");
                }}
              >
                Edit in Profile
              </button>
              <button
                type="button"
                className="order-btn-primary"
                onClick={() => {
                  toast.info("Add new address form opening...");
                }}
              >
                Add New Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          3D PRINT FILES MODAL (FOR SIDEBAR / QUICK ACTION)
          ===================================================== */}
      {show3DModal && (
        <div
          className="orders-modal-backdrop"
          onClick={() => setShow3DModal(false)}
        >
          <div
            className="orders-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="orders-modal-header">
              <h3>My 3D Print Files</h3>
              <button
                className="orders-modal-close-btn"
                onClick={() => setShow3DModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="orders-modal-body">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>
                    spiral_vase_lattice.stl
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    14.2 MB • Uploaded 03 Aug 2024 • Bambu PLA
                  </div>
                </div>
                <button
                  type="button"
                  className="order-btn-outline"
                  style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                  onClick={() => toast.success("Downloading STL file...")}
                >
                  <Download size={14} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>
                    mount_bracket_v2.step
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    8.6 MB • Uploaded 12 Jul 2024 • PETG Solid
                  </div>
                </div>
                <button
                  type="button"
                  className="order-btn-outline"
                  style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                  onClick={() => toast.success("Downloading STEP file...")}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
            <div className="orders-modal-footer">
              <button
                type="button"
                className="order-btn-outline"
                onClick={() => setShow3DModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="order-btn-primary"
                onClick={() => toast.info("Opening 3D model uploader...")}
              >
                Upload New Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
