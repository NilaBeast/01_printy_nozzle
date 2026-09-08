import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../../public/css/product.css";
import "../../public/css/product-details.css";
import productData from "../data/products.json";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find product by id
  const product = useMemo(() => {
    return productData.find((p) => p.id.toString() === id?.toString());
  }, [id]);

  // Gallery state
  const [selectedImage, setSelectedImage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [isWishlist, setIsWishlist] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Scroll to top and set default image on ID change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (product) {
      setSelectedImage(product.image);
      setQuantity(1);
      setDeliveryStatus("");
    }
  }, [id, product]);

  // If product not found
  if (!product) {
    return (
      <div className="product-details-page">
        <div className="container py-5 text-center">
          <div className="no-products-found my-5">
            <i className="bi bi-exclamation-circle text-warning fs-1 mb-3"></i>
            <h2>Product Not Found</h2>
            <p className="text-muted">
              The product you are looking for does not exist or has been removed.
            </p>
            <Link to="/products" className="btn btn-primary px-4 py-2 mt-3">
              <i className="bi bi-arrow-left me-2"></i>
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Gallery images array
  const galleryImages = product.gallery && product.gallery.length > 0
    ? product.gallery
    : [product.image];

  // Related products (same category or others, excluding current)
  const relatedProducts = productData
    .filter((p) => p.id !== product.id && (p.category === product.category || !product.category))
    .slice(0, 6);

  // If less than 6, append other items to ensure rich 6-item row
  const fillRelatedProducts =
    relatedProducts.length >= 6
      ? relatedProducts
      : [
          ...relatedProducts,
          ...productData
            .filter((p) => p.id !== product.id && !relatedProducts.some((r) => r.id === p.id))
            .slice(0, 6 - relatedProducts.length),
        ];

  // Percent-based Stars helper
  const renderStars = (ratingCount = 5) => {
    const percent = Math.min(100, Math.max(0, (ratingCount / 5) * 100));
    return (
      <div className="percent-stars" title={`${ratingCount} out of 5 stars`}>
        <div className="stars-layer stars-bg">
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
        </div>
        <div className="stars-layer stars-fill" style={{ width: `${percent}%` }}>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
          <i className="bi bi-star-fill"></i>
        </div>
      </div>
    );
  };

  // Cart handling
  const handleAddToCart = () => {
    toast.success(`Added ${quantity}x "${product.name}" to cart!`);
  };

  const handleBuyNow = () => {
    toast.success(`Proceeding to checkout with ${quantity}x "${product.name}"!`);
  };

  // Wishlist toggle
  const toggleWishlist = () => {
    setIsWishlist(!isWishlist);
    if (!isWishlist) {
      toast.info(`Added "${product.name}" to your wishlist!`);
    } else {
      toast.info(`Removed "${product.name}" from wishlist.`);
    }
  };

  // Share handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    } else {
      toast.info("Share URL: " + window.location.href);
    }
  };

  // Pincode checker
  const checkDelivery = (e) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length < 6) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }
    setDeliveryStatus(`Delivery available to ${pincode}! Expected within 3-4 working days.`);
  };

  // Highlight items fallback
  const highlights = product.highlights || [
    { icon: "bi-cpu", title: "Dual Core", subtitle: "240 MHz" },
    { icon: "bi-wifi", title: "Wi-Fi", subtitle: "802.11 b/g/n" },
    { icon: "bi-bluetooth", title: "Bluetooth", subtitle: "v4.2 (BLE)" },
    { icon: "bi-code-slash", title: "Arduino /", subtitle: "MicroPython" },
    { icon: "bi-gear", title: "Wide", subtitle: "Community Support" },
  ];

  return (
    <div className="product-details-page">
      {/* ================= BREADCRUMB BAR ================= */}
      <nav className="pd-breadcrumb-bar">
        <div className="container">
          <div className="pd-breadcrumb">
            <Link to="/">Home</Link>
            <span className="separator">&gt;</span>
            <Link to="/products">Products</Link>
            {product.category && (
              <>
                <span className="separator">&gt;</span>
                <Link to={`/products?category=${encodeURIComponent(product.category)}`}>
                  {product.category}
                </Link>
              </>
            )}
            <span className="separator">&gt;</span>
            <span className="current">{product.name}</span>
          </div>
        </div>
      </nav>

      <div className="container">
        {/* ================= MAIN CARD (Gallery & Product Info) ================= */}
        <div className="pd-main-card">
          <div className="row g-4">
            {/* Left Column: Gallery & Highlights */}
            <div className="col-lg-6">
              <div className="pd-gallery-container">
                {/* Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="pd-thumbnail-col">
                    {galleryImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`pd-thumb-btn ${selectedImage === imgUrl ? "active" : ""}`}
                        onClick={() => setSelectedImage(imgUrl)}
                      >
                        <img src={imgUrl} alt={`${product.name} view ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Large Image */}
                <div className="pd-main-image-wrapper">
                  <img
                    src={selectedImage || product.image}
                    alt={product.name}
                    className="pd-main-image"
                  />
                  <button
                    type="button"
                    className="pd-zoom-btn"
                    title="Click to view full image"
                    onClick={() => setIsZoomed(true)}
                  >
                    <i className="bi bi-arrows-fullscreen"></i>
                  </button>
                </div>
              </div>

              {/* Highlights strip below image */}
              <div className="pd-highlights-row">
                {highlights.map((hl, i) => (
                  <div key={i} className="pd-highlight-badge">
                    <i className={`bi ${hl.icon} pd-highlight-icon`}></i>
                    <span className="pd-highlight-title">{hl.title}</span>
                    <span className="pd-highlight-subtitle">{hl.subtitle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Product Info & Actions */}
            <div className="col-lg-6 pd-info-col">
              {/* Badges Row */}
              <div className="pd-badges-row">
                {product.tag && (
                  <span className={`product-badge ${product.tag.toLowerCase()}`} style={{ position: "static" }}>
                    {product.tag}
                  </span>
                )}
                <div className="pd-stock-pill">
                  <span className="pd-stock-dot"></span>
                  <span>{product.availability || "In Stock"}</span>
                </div>
              </div>

              <h1 className="pd-title">{product.name}</h1>
              {product.subtitle && <h2 className="pd-subtitle">{product.subtitle}</h2>}

              {/* Ratings */}
              <div className="pd-rating-block">
                <div className="rating-stars-row">{renderStars(product.rating)}</div>
                <span className="pd-rating-text">{product.rating}</span>
                <span className="pd-review-count">({product.reviewCount || 128} reviews)</span>
                <span className="text-muted">|</span>
                <a href="#reviews" onClick={() => setActiveTab("reviews")} className="pd-write-review">
                  Write a review
                </a>
              </div>

              {/* Description lead */}
              <p className="pd-description-lead">{product.description}</p>

              {/* Pricing */}
              <div className="pd-price-row">
                <span className="pd-price-current">₹{product.price.toLocaleString()}</span>
                {product.originalPrice && (
                  <>
                    <span className="pd-price-original">₹{product.originalPrice.toLocaleString()}</span>
                    <span className="pd-discount-badge">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Value checklist */}
              <ul className="pd-value-checklist">
                <li className="pd-value-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Original &amp; High Quality</span>
                </li>
                <li className="pd-value-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Tested Before Shipping</span>
                </li>
                <li className="pd-value-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>7 Days Easy Returns</span>
                </li>
                <li className="pd-value-item">
                  <i className="bi bi-check-circle-fill"></i>
                  <span>Fast Delivery Across India</span>
                </li>
              </ul>

              {/* Quantity & Action Buttons */}
              <div className="pd-actions-wrapper">
                <span className="pd-quantity-label">Quantity:</span>
                <div className="pd-buttons-group">
                  <div className="pd-qty-box">
                    <button
                      type="button"
                      className="pd-qty-btn"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      -
                    </button>
                    <span className="pd-qty-num">{quantity}</span>
                    <button
                      type="button"
                      className="pd-qty-btn"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button type="button" className="btn-pd-add-cart" onClick={handleAddToCart}>
                    <i className="bi bi-cart3"></i>
                    <span>Add to Cart</span>
                  </button>

                  <button type="button" className="btn-pd-buy-now" onClick={handleBuyNow}>
                    Buy Now
                  </button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="pd-secondary-actions">
                <button type="button" className="pd-sec-btn" onClick={toggleWishlist}>
                  <i className={`bi ${isWishlist ? "bi-heart-fill text-danger" : "bi-heart"}`}></i>
                  <span>{isWishlist ? "Wishlisted" : "Add to Wishlist"}</span>
                </button>

                <button type="button" className="pd-sec-btn" onClick={handleShare}>
                  <i className="bi bi-share"></i>
                  <span>Share</span>
                </button>
              </div>

              {/* Check Delivery Widget */}
              <div className="pd-delivery-widget">
                <div className="pd-delivery-header">
                  <i className="bi bi-truck pd-delivery-icon"></i>
                  <h4 className="pd-delivery-title">Check Delivery Availability</h4>
                </div>
                <form className="pd-pincode-form" onSubmit={checkDelivery}>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter pincode"
                    className="pd-pincode-input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button type="submit" className="btn-pd-pincode-check">
                    Check
                  </button>
                </form>
                <p className="pd-delivery-time">
                  {deliveryStatus || "Usually delivers in 3 - 5 working days"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= TABS SECTION ================= */}
        <div className="pd-tabs-card" id="reviews">
          <nav className="pd-tabs-nav">
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "specifications" ? "active" : ""}`}
              onClick={() => setActiveTab("specifications")}
            >
              Specifications
            </button>
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "pinout" ? "active" : ""}`}
              onClick={() => setActiveTab("pinout")}
            >
              Pinout
            </button>
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "resources" ? "active" : ""}`}
              onClick={() => setActiveTab("resources")}
            >
              Resources
            </button>
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews ({product.reviewCount || 128})
            </button>
            <button
              type="button"
              className={`pd-tab-btn ${activeTab === "faqs" ? "active" : ""}`}
              onClick={() => setActiveTab("faqs")}
            >
              FAQs
            </button>
          </nav>

          <div className="pd-tab-content-area">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="pd-overview-grid">
                <div>
                  <h3 className="pd-content-section-title">Product Description</h3>
                  <p className="pd-prose-text">
                    The {product.name} is a feature-rich development solution designed for makers,
                    engineers, and hobbyists. It combines high performance, low power consumption,
                    and reliable connectivity, making it perfect for IoT and embedded applications.
                    With support for standard development environments, it is widely used by students,
                    professionals, and hardware innovators worldwide.
                  </p>

                  <h3 className="pd-content-section-title">Key Features</h3>
                  <ul className="pd-features-list">
                    {(product.keyFeatures || [
                      "Powered by high-performance dual-core processing engine",
                      "Integrated wireless connectivity with built-in antenna",
                      "Multiple peripheral interfaces for sensors and actuators",
                      "Supports standard development toolchains and IDEs",
                      "On-board power management and communication bridge",
                      "Compact and breadboard friendly layout",
                    ]).map((feat, i) => (
                      <li key={i} className="pd-feature-item">
                        <i className="bi bi-check2"></i>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right side widgets */}
                <div>
                  <div className="pd-side-card">
                    <h4 className="pd-side-title">Applications</h4>
                    <ul className="pd-applications-list">
                      {(product.applications || [
                        "IoT Projects",
                        "Home Automation",
                        "Wireless Sensor Networks",
                        "Robotics",
                        "DIY Electronics",
                        "Smart Wearables",
                      ]).map((app, i) => (
                        <li key={i} className="pd-application-item">
                          <i className="bi bi-check-circle text-primary"></i>
                          <span>{app}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pd-help-card">
                    <div className="pd-help-top">
                      <i className="bi bi-chat-dots pd-help-icon"></i>
                      <div>
                        <h4>Need Help?</h4>
                        <p>Have questions about this product? Our team is here to help.</p>
                      </div>
                    </div>
                    <Link to="/contact" className="btn-contact-support">
                      Contact Support
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* SPECIFICATIONS TAB */}
            {activeTab === "specifications" && (
              <div>
                <h3 className="pd-content-section-title">Technical Specifications</h3>
                <table className="specs-table">
                  <tbody>
                    {product.specifications &&
                      Object.entries(product.specifications).map(([key, val]) => (
                        <tr key={key}>
                          <td className="specs-label">{key}</td>
                          <td className="specs-val">{val}</td>
                        </tr>
                      ))}
                    <tr>
                      <td className="specs-label">Brand</td>
                      <td className="specs-val">{product.brand}</td>
                    </tr>
                    <tr>
                      <td className="specs-label">Category</td>
                      <td className="specs-val">{product.category}</td>
                    </tr>
                    <tr>
                      <td className="specs-label">Stock Status</td>
                      <td className="specs-val">{product.availability}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* PINOUT TAB */}
            {activeTab === "pinout" && (
              <div>
                <h3 className="pd-content-section-title">Pinout Diagram &amp; Schematic</h3>
                <p className="pd-prose-text">
                  Standard 2.54mm pitch GPIO header mapping. Connect power to VIN / 5V or 3.3V as
                  specified in the hardware datasheet.
                </p>
                <div className="p-4 bg-light rounded text-center border">
                  <i className="bi bi-diagram-3 fs-1 text-primary mb-2 d-block"></i>
                  <p className="mb-0 text-muted fw-semibold">
                    Detailed pinout mapping and high-resolution board diagram available for download in
                    Resources tab.
                  </p>
                </div>
              </div>
            )}

            {/* RESOURCES TAB */}
            {activeTab === "resources" && (
              <div>
                <h3 className="pd-content-section-title">Datasheets &amp; Downloads</h3>
                <ul className="list-group list-group-flush border rounded">
                  <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                      <i className="bi bi-file-earmark-pdf text-danger me-2 fs-5"></i>
                      <strong>{product.name} Official Datasheet (PDF)</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toast.info("Datasheet download link generated.")}
                    >
                      <i className="bi bi-download me-1"></i> Download
                    </button>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                      <i className="bi bi-github me-2 fs-5"></i>
                      <strong>Sample Code &amp; Libraries</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toast.info("Redirecting to documentation repository.")}
                    >
                      View on GitHub
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h3 className="pd-content-section-title mb-0">
                    Customer Reviews ({product.reviewCount || 128})
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => toast.info("Review submission modal opened.")}
                  >
                    Write a Review
                  </button>
                </div>

                <div className="d-flex flex-column gap-3">
                  <div className="p-3 border rounded bg-light">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <strong>Arun Kumar</strong>
                        <span className="badge bg-success">Verified Buyer</span>
                      </div>
                      <small className="text-muted">2 days ago</small>
                    </div>
                    <div className="rating-stars-row mb-2">{renderStars(5)}</div>
                    <p className="mb-0 text-secondary">
                      Excellent quality board! Uploading sketch was smooth without any driver hassle.
                      Fast delivery from Printy Nozzles as well.
                    </p>
                  </div>

                  <div className="p-3 border rounded bg-light">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <strong>Rohan Verma</strong>
                        <span className="badge bg-success">Verified Buyer</span>
                      </div>
                      <small className="text-muted">1 week ago</small>
                    </div>
                    <div className="rating-stars-row mb-2">{renderStars(5)}</div>
                    <p className="mb-0 text-secondary">
                      Genuine components and very neatly packaged. Works perfectly for my IoT home
                      automation system.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FAQS TAB */}
            {activeTab === "faqs" && (
              <div>
                <h3 className="pd-content-section-title">Frequently Asked Questions</h3>
                <div className="d-flex flex-column gap-3">
                  {(product.faqs || [
                    {
                      q: "Is this board compatible with Arduino IDE?",
                      a: "Yes, it is fully compatible with Arduino IDE, ESP-IDF, PlatformIO, and MicroPython.",
                    },
                    {
                      q: "What is the warranty and return policy?",
                      a: "We offer a 7-day hassle-free replacement or return warranty on any manufacturing defect.",
                    },
                  ]).map((faq, i) => (
                    <div key={i} className="p-3 border rounded bg-light">
                      <h5 className="fw-bold mb-2 text-dark">
                        <i className="bi bi-question-circle-fill text-primary me-2"></i>
                        {faq.q}
                      </h5>
                      <p className="mb-0 text-secondary ps-4">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RELATED PRODUCTS ================= */}
        <div className="pd-related-wrapper">
          <div className="pd-related-header">
            <h2>Related Products</h2>
            <Link to="/products" className="pd-related-view-all">
              View All
            </Link>
          </div>

          <div className="pd-related-grid">
            {fillRelatedProducts.map((relItem) => (
              <div
                key={relItem.id}
                className="pd-related-card"
                onClick={() => navigate(`/product/${relItem.id}`)}
              >
                <div className="pd-related-img-box">
                  <img src={relItem.image} alt={relItem.name} loading="lazy" />
                </div>
                <h4 className="pd-related-title" title={relItem.name}>
                  {relItem.name}
                </h4>
                <div className="pd-related-price">₹{relItem.price.toLocaleString()}</div>
                <div className="pd-related-bottom">
                  <div className="rating-stars-row">{renderStars(relItem.rating)}</div>
                  <button
                    type="button"
                    className="btn-add-cart"
                    style={{ width: "32px", height: "32px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success(`Added "${relItem.name}" to cart!`);
                    }}
                    title="Add to cart"
                  >
                    <i className="bi bi-cart3"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= TRUST BADGES BANNER ================= */}
        <div className="trust-badges-container">
          <div className="row g-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="trust-badge-item">
                <div className="trust-icon-box">
                  <i className="bi bi-truck"></i>
                </div>
                <div className="trust-badge-info">
                  <h4>Free Shipping</h4>
                  <p>On orders over ₹999</p>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="trust-badge-item">
                <div className="trust-icon-box">
                  <i className="bi bi-arrow-repeat"></i>
                </div>
                <div className="trust-badge-info">
                  <h4>7 Days Returns</h4>
                  <p>Hassle-free returns</p>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="trust-badge-item">
                <div className="trust-icon-box">
                  <i className="bi bi-shield-check"></i>
                </div>
                <div className="trust-badge-info">
                  <h4>Secure Payments</h4>
                  <p>100% safe &amp; secure</p>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="trust-badge-item">
                <div className="trust-icon-box">
                  <i className="bi bi-headset"></i>
                </div>
                <div className="trust-badge-info">
                  <h4>24/7 Support</h4>
                  <p>We're here to help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Image Zoom Modal */}
      {isZoomed && (
        <div
          className="product-modal-backdrop"
          onClick={() => setIsZoomed(false)}
          style={{ cursor: "zoom-out" }}
        >
          <div
            style={{
              maxWidth: "800px",
              maxHeight: "85vh",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "2rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn-modal-close position-absolute top-0 end-0 m-3"
              onClick={() => setIsZoomed(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <img
              src={selectedImage || product.image}
              alt={product.name}
              style={{
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
