import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../../public/css/product.css";
import "../../public/css/product-details.css";
import catalogService, { normalizeProduct } from "../services/catalog.service";
import cartService from "../services/cart.service";
import profileService from "../services/profile.service";
import { syncCartBadge } from "../utils/cartSync";
import useSiteSettings from "../hooks/useSiteSettings";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { freeShippingThreshold } = useSiteSettings();

  const [apiProduct, setApiProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const product = apiProduct;

  // Gallery state
  const [selectedImage, setSelectedImage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [isWishlist, setIsWishlist] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const reloadProduct = async () => {
    try {
      const response = await catalogService.getProduct(id);
      setApiProduct(normalizeProduct(response.data.product));
    } catch (error) {
      /* keep current product on refresh failure */
    }
  };

  // Sync wishlist state from server
  useEffect(() => {
    let active = true;
    if (!localStorage.getItem("token")) {
      setIsWishlist(false);
      return;
    }
    profileService
      .getWishlist()
      .then((res) => {
        if (!active) return;
        const items = res.data?.wishlist || [];
        setIsWishlist(items.some((item) => Number(item.product_id || item.id) === Number(id)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem("token")) {
      toast.warn("Please login to write a review.");
      navigate("/login");
      return;
    }
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      toast.warn("Please select a rating between 1 and 5 stars.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await catalogService.submitReview(id, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      toast.success(res.data?.message || "Review submitted! It will appear after approval.");
      setReviewOpen(false);
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      reloadProduct();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to submit review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      try {
        setDetailLoading(true);
        const response = await catalogService.getProduct(id);
        if (active) {
          setApiProduct(normalizeProduct(response.data.product));
        }
      } catch (error) {
        if (active) {
          setApiProduct(null);
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      active = false;
    };
  }, [id]);

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
  if (detailLoading && !product) {
    return (
      <div className="product-details-page">
        <div className="container py-5 text-center">Loading product...</div>
      </div>
    );
  }

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

  // Related products from DB
  const fillRelatedProducts = (product.related_products || []).map(normalizeProduct);

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
  const handleAddToCart = async () => {
    if (!localStorage.getItem("token")) {
      toast.info("Please login to add items to cart");
      navigate("/login", { state: { from: `/product/${id}` } });
      return false;
    }

    try {
      await cartService.addItem({ product_id: product.id, quantity });
      toast.success(`Added ${quantity}x "${product.name}" to cart!`);
      syncCartBadge();
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to add item to cart");
      return false;
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddToCart();
    if (added) navigate("/checkout");
  };

  const handleRelatedAddToCart = async (relatedItem) => {
    if (!localStorage.getItem("token")) {
      toast.info("Please login to add items to cart");
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    try {
      await cartService.addItem({ product_id: relatedItem.id, quantity: 1 });
      toast.success(`Added "${relatedItem.name}" to cart!`);
      syncCartBadge();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to add item to cart");
    }
  };

  // Wishlist toggle (server-backed)
  const toggleWishlist = async () => {
    if (!localStorage.getItem("token")) {
      toast.info("Please login to use your wishlist");
      navigate("/login", { state: { from: `/product/${id}` } });
      return;
    }
    try {
      const res = await profileService.toggleWishlist(product.id);
      const inWishlist = Boolean(res.data?.in_wishlist ?? !isWishlist);
      setIsWishlist(inWishlist);
      toast.success(res.data?.message || (inWishlist ? `Added "${product.name}" to your wishlist!` : `Removed "${product.name}" from wishlist.`));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to update wishlist");
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
  const checkDelivery = async (e) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length < 6) {
      toast.error("Please enter a valid 6-digit pincode.");
      return;
    }
    try {
      const response = await catalogService.checkPincode(pincode);
      setDeliveryStatus(response.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to check delivery");
    }
  };

  // Highlight items come from product data (added by admin)
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];

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
                <span className="pd-review-count">({product.reviewCount || 0} reviews)</span>
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
              Reviews ({product.reviewCount || 0})
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
                  {product.description ? (
                    <p className="pd-prose-text">{product.description}</p>
                  ) : (
                    <p className="pd-prose-text text-muted">
                      No description added for this product yet.
                    </p>
                  )}

                  {product.keyFeatures?.length > 0 && (
                    <>
                      <h3 className="pd-content-section-title">Key Features</h3>
                      <ul className="pd-features-list">
                        {product.keyFeatures.map((feat, i) => (
                          <li key={i} className="pd-feature-item">
                            <i className="bi bi-check2"></i>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {/* Right side widgets */}
                <div>
                  {product.applications?.length > 0 && (
                    <div className="pd-side-card">
                      <h4 className="pd-side-title">Applications</h4>
                      <ul className="pd-applications-list">
                        {product.applications.map((app, i) => (
                          <li key={i} className="pd-application-item">
                            <i className="bi bi-check-circle text-primary"></i>
                            <span>{app}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                {product.pinout_image ? (
                  <a href={product.pinout_image} target="_blank" rel="noopener noreferrer" className="d-block mb-3">
                    <img
                      src={product.pinout_image}
                      alt={`${product.name} pinout diagram`}
                      className="img-fluid border rounded w-100"
                    />
                  </a>
                ) : (
                  <div className="p-4 bg-light rounded text-center border">
                    <i className="bi bi-diagram-3 fs-1 text-primary mb-2 d-block"></i>
                    <p className="mb-0 text-muted fw-semibold">
                      Pinout diagram not available for this product yet.
                    </p>
                  </div>
                )}
                {product.pinout_description && (
                  <p className="pd-prose-text mt-3">{product.pinout_description}</p>
                )}
              </div>
            )}

            {/* RESOURCES TAB */}
            {activeTab === "resources" && (
              <div>
                <h3 className="pd-content-section-title">Datasheets &amp; Downloads</h3>
                {product.resources?.length > 0 ? (
                  <ul className="list-group list-group-flush border rounded">
                    {product.resources.map((res, idx) => {
                      const type = String(res.type || "").toLowerCase();
                      const icon =
                        type === "pdf"
                          ? "bi-file-earmark-pdf text-danger"
                          : type === "github"
                            ? "bi-github"
                            : type === "image"
                              ? "bi-image"
                              : type === "file"
                                ? "bi-file-earmark"
                                : "bi-link-45deg";
                      return (
                        <li
                          key={idx}
                          className="list-group-item d-flex justify-content-between align-items-center py-3"
                        >
                          <div>
                            <i className={`${icon} me-2 fs-5`}></i>
                            <strong>{res.name || `Resource ${idx + 1}`}</strong>
                          </div>
                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="bi bi-download me-1"></i> Download
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-4 bg-light rounded text-center border">
                    <i className="bi bi-folder2-open fs-1 text-primary mb-2 d-block"></i>
                    <p className="mb-0 text-muted fw-semibold">
                      No resources available for this product yet.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h3 className="pd-content-section-title mb-0">
                    Customer Reviews ({product.reviewCount || 0})
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setReviewOpen(true)}
                  >
                    Write a Review
                  </button>
                </div>

                <div className="d-flex flex-column gap-3">
                  {(product.recent_reviews || []).length > 0 ? (
                    product.recent_reviews.map((review) => {
                      const reviewerName = `${review.first_name || ""} ${review.last_name || ""}`.trim() || "Verified Customer";
                      const reviewDate = review.created_at
                        ? new Date(review.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "";
                      return (
                        <div key={review.id} className="p-3 border rounded bg-light">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <div className="pd-reviewer-avatar">
                                {review.avatar_url ? (
                                  <img src={review.avatar_url} alt={reviewerName} />
                                ) : (
                                  <span>{reviewerName.charAt(0)}</span>
                                )}
                              </div>
                              <strong>{reviewerName}</strong>
                              {review.is_verified_purchase && (
                                <span className="badge bg-success">Verified Buyer</span>
                              )}
                            </div>
                            {reviewDate && <small className="text-muted">{reviewDate}</small>}
                          </div>
                          <div className="rating-stars-row mb-2">{renderStars(review.rating)}</div>
                          {review.title && <h6 className="fw-semibold mb-1">{review.title}</h6>}
                          {review.comment && (
                            <p className="mb-0 text-secondary">{review.comment}</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-light rounded text-center border">
                      <i className="bi bi-chat-square-dots fs-1 text-primary mb-2 d-block"></i>
                      <p className="mb-0 text-muted fw-semibold">
                        No reviews yet. Be the first to review this product!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FAQS TAB */}
            {activeTab === "faqs" && (
              <div>
                <h3 className="pd-content-section-title">Frequently Asked Questions</h3>
                {(product.faqs || []).length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {product.faqs.map((faq, i) => (
                      <div key={i} className="p-3 border rounded bg-light">
                        <h5 className="fw-bold mb-2 text-dark">
                          <i className="bi bi-question-circle-fill text-primary me-2"></i>
                          {faq.q || faq.question}
                        </h5>
                        <p className="mb-0 text-secondary ps-4">{faq.a || faq.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-light rounded text-center border">
                    <i className="bi bi-question-circle fs-1 text-primary mb-2 d-block"></i>
                    <p className="mb-0 text-muted fw-semibold">
                      No FAQs available for this product yet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================= RELATED PRODUCTS ================= */}
        {fillRelatedProducts.length > 0 && (
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
                          handleRelatedAddToCart(relItem);
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
        )}

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
                  <p>On orders over ₹{freeShippingThreshold}</p>
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

      {/* Write a Review Modal */}
      {reviewOpen && (
        <div
          className="product-modal-backdrop"
          onClick={() => setReviewOpen(false)}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "calc(100% - 2rem)",
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn-modal-close position-absolute top-0 end-0 m-3"
              onClick={() => setReviewOpen(false)}
              aria-label="Close review form"
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <h4 className="fw-bold mb-1">Write a Review</h4>
            <p className="text-muted small mb-3">
              {product.name} — reviews appear on the storefront after admin approval.
            </p>
            <form onSubmit={submitReview}>
              <label className="form-label fw-semibold">Your rating</label>
              <div className="d-flex gap-1 mb-3" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: "1.75rem",
                      color: star <= reviewRating ? "#f5a623" : "#d7dee8",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Review title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Sum it up in a line"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Your review</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="What did you like or dislike about this product?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

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
