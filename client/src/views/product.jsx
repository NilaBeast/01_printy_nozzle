import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../../public/css/product.css";
import productData from "../data/products.json";
import SkeletonCard from "../components/Loaders/SkeletonCard";
import catalogService, { normalizeProduct } from "../services/catalog.service";
import cartService from "../services/cart.service";

// Category configurations with appropriate icons
const CATEGORIES = [
  { id: "all", name: "All Products", icon: "bi-grid" },
  { id: "Microcontrollers", name: "Microcontrollers", icon: "bi-cpu" },
  { id: "Modules & Sensors", name: "Modules & Sensors", icon: "bi-sliders" },
  { id: "Power Supplies", name: "Power Supplies", icon: "bi-plug" },
  { id: "Tools & Accessories", name: "Tools & Accessories", icon: "bi-tools" },
  { id: "Additive & 3D Parts", name: "Additive & 3D Parts", icon: "bi-box" },
  { id: "3D Printer Parts", name: "3D Printer Parts", icon: "bi-gear-wide-connected" },
  { id: "Cables & Wires", name: "Cables & Wires", icon: "bi-bezier2" },
  { id: "Displays", name: "Displays", icon: "bi-display" },
  { id: "Robotics", name: "Robotics", icon: "bi-robot" },
  { id: "IoT & Communication", name: "IoT & Communication", icon: "bi-broadcast" },
];

const BRANDS = [
  "ESPRESSIF",
  "Arduino",
  "Raspberry Pi",
  "HiLetgo",
  "DFRobot",
  "Seeed Studio",
];

const ITEMS_PER_PAGE = 12;

export default function Product() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search & Filter states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState(productData);

  // UX & Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [addedCartIds, setAddedCartIds] = useState([]);

  // Search query from URL
  const searchQuery = searchParams.get("search") || "";
  const categoryQuery = searchParams.get("category") || "";

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const response = await catalogService.getProducts({
          limit: 100,
          search: searchQuery || undefined,
        });
        const products = (response.data.products || []).map(normalizeProduct);
        if (active && products.length > 0) {
          setCatalogProducts(products);
        }
      } catch (error) {
        if (active) {
          setCatalogProducts(productData);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      active = false;
    };
  }, [searchQuery]);

  // Initialize filters from URL parameters if present
  useEffect(() => {
    if (categoryQuery) {
      const matched = CATEGORIES.find(
        (c) => c.name.toLowerCase() === categoryQuery.toLowerCase() || c.id.toLowerCase() === categoryQuery.toLowerCase()
      );
      if (matched) {
        setSelectedCategory(matched.name);
      }
    }
  }, [categoryQuery]);

  // Loading skeleton simulation on mount or category change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  // Reset pagination when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    maxPrice,
    selectedBrands,
    selectedAvailability,
    selectedRatings,
    searchQuery,
    sortBy,
  ]);

  // Image load handler
  const handleImageLoad = (id) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Brand toggle
  const toggleBrand = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  // Availability toggle
  const toggleAvailability = (status) => {
    setSelectedAvailability((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  // Rating toggle
  const toggleRating = (stars) => {
    setSelectedRatings((prev) =>
      prev.includes(stars) ? prev.filter((r) => r !== stars) : [...prev, stars]
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategory("all");
    setMaxPrice(10000);
    setSelectedBrands([]);
    setSelectedAvailability([]);
    setSelectedRatings([]);
    setSortBy("newest");
    if (searchQuery) {
      setSearchParams({});
    }
  };

  // Add to cart handler
  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    if (!localStorage.getItem("token")) {
      toast.info("Please login to add items to cart");
      navigate("/login", { state: { from: "/products" } });
      return;
    }

    setAddedCartIds((prev) => [...prev, product.id]);

    try {
      await cartService.addItem({ product_id: product.id, quantity: 1 });
      toast.success(`Added "${product.name}" to cart!`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to add item to cart");
    }

    setTimeout(() => {
      setAddedCartIds((prev) => prev.filter((id) => id !== product.id));
    }, 1800);
  };

  // Navigate to product details page
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Calculate brand counts based on entire dataset
  const brandCounts = useMemo(() => {
    const counts = {};
    BRANDS.forEach((brand) => {
      counts[brand] = catalogProducts.filter((p) => p.brand === brand).length;
    });
    return counts;
  }, [catalogProducts]);

  // Calculate availability counts
  const availabilityCounts = useMemo(() => {
    return {
      "In Stock": catalogProducts.filter((p) => p.availability === "In Stock").length,
      "Out of Stock": catalogProducts.filter((p) => p.availability === "Out of Stock").length,
    };
  }, [catalogProducts]);

  // Calculate rating counts
  const ratingCounts = useMemo(() => {
    return {
      5: catalogProducts.filter((p) => p.rating === 5 || p.rating >= 4.5).length,
      4: catalogProducts.filter((p) => p.rating >= 4 && p.rating < 4.5).length,
      3: catalogProducts.filter((p) => p.rating >= 3 && p.rating < 4).length,
      2: catalogProducts.filter((p) => p.rating >= 2 && p.rating < 3).length,
      1: catalogProducts.filter((p) => p.rating >= 1 && p.rating < 2).length,
    };
  }, [catalogProducts]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return catalogProducts
      .filter((product) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchName = product.name.toLowerCase().includes(query);
          const matchCategory = product.category.toLowerCase().includes(query);
          const matchBrand = (product.brand || "").toLowerCase().includes(query);
          const matchDesc = (product.description || "").toLowerCase().includes(query);
          if (!matchName && !matchCategory && !matchBrand && !matchDesc) return false;
        }

        // Category filter
        if (selectedCategory !== "all" && product.category !== selectedCategory) {
          return false;
        }

        // Price filter
        if (product.price > maxPrice) {
          return false;
        }

        // Brand filter
        if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) {
          return false;
        }

        // Availability filter
        if (selectedAvailability.length > 0 && !selectedAvailability.includes(product.availability)) {
          return false;
        }

        // Rating filter
        if (selectedRatings.length > 0) {
          const satisfiesRating = selectedRatings.some((r) => product.rating >= r);
          if (!satisfiesRating) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "popular") return b.reviewCount - a.reviewCount;
        // Default newest: natural original catalog sequence (1 to 27)
        return a.id - b.id;
      });
  }, [
    selectedCategory,
    maxPrice,
    selectedBrands,
    selectedAvailability,
    selectedRatings,
    searchQuery,
    sortBy,
    catalogProducts,
  ]);

  // Paginated items
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Active filters count for mobile indicator
  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (maxPrice < 10000 ? 1 : 0) +
    selectedBrands.length +
    selectedAvailability.length +
    selectedRatings.length +
    (searchQuery ? 1 : 0);

  // Render Percent-based Star Icons
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

  // Reusable Sidebar Filters Component
  const FilterContent = () => (
    <>
      {/* Categories */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Categories</h3>
        <ul className="category-list">
          {CATEGORIES.map((cat) => {
            const isActive =
              cat.id === "all"
                ? selectedCategory === "all"
                : selectedCategory === cat.name;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  className={`category-item-btn ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategory(cat.id === "all" ? "all" : cat.name);
                    setMobileFilterOpen(false);
                  }}
                >
                  <span className="category-icon">
                    <i className={`bi ${cat.icon}`}></i>
                  </span>
                  <span>{cat.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Filter by Price */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Filter by Price</h3>
        <div className="price-slider-container">
          <input
            type="range"
            min="0"
            max="10000"
            step="50"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="price-range-input"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                (maxPrice / 10000) * 100
              }%, #e2e8f0 ${(maxPrice / 10000) * 100}%, #e2e8f0 100%)`,
            }}
          />
          <div className="price-labels">
            <span>₹0</span>
            <span>{maxPrice >= 10000 ? "₹10,000+" : `₹${maxPrice.toLocaleString()}`}</span>
          </div>
        </div>
      </div>

      {/* Brand */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Brand</h3>
        <div className="filter-checkbox-list">
          {(showAllBrands ? BRANDS : BRANDS.slice(0, 6)).map((brand) => (
            <label key={brand} className="filter-checkbox-item">
              <div className="filter-checkbox-left">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
                <span>{brand}</span>
              </div>
              <span className="filter-count">({brandCounts[brand] || 0})</span>
            </label>
          ))}
        </div>
        {BRANDS.length > 6 && (
          <button
            type="button"
            className="view-more-toggle"
            onClick={() => setShowAllBrands(!showAllBrands)}
          >
            {showAllBrands ? "View less ∧" : "View more ∨"}
          </button>
        )}
      </div>

      {/* Availability */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Availability</h3>
        <div className="filter-checkbox-list">
          {["In Stock", "Out of Stock"].map((status) => (
            <label key={status} className="filter-checkbox-item">
              <div className="filter-checkbox-left">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={selectedAvailability.includes(status)}
                  onChange={() => toggleAvailability(status)}
                />
                <span>{status}</span>
              </div>
              <span className="filter-count">
                ({availabilityCounts[status] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Rating</h3>
        <div className="filter-checkbox-list">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="filter-checkbox-item">
              <div className="filter-checkbox-left">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={selectedRatings.includes(stars)}
                  onChange={() => toggleRating(stars)}
                />
                <div className="rating-stars-row">{renderStars(stars)}</div>
              </div>
              <span className="filter-count">({ratingCounts[stars] || 0})</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear All Filters Button */}
      <button
        type="button"
        className="btn-clear-filters"
        onClick={clearAllFilters}
      >
        <i className="bi bi-trash3"></i>
        <span>Clear All Filters</span>
      </button>
    </>
  );

  return (
    <div className="products-page-container">
      {/* ================= HEADER & BREADCRUMB ================= */}
      <header className="products-hero-header">
        <div className="container position-relative">
          <h1 className="page-title">All Products</h1>
          <nav className="breadcrumb-nav">
            <Link to="/">Home</Link>
            <span className="breadcrumb-separator">&gt;</span>
            <span className="breadcrumb-current">Products</span>
            {selectedCategory !== "all" && (
              <>
                <span className="breadcrumb-separator">&gt;</span>
                <span className="breadcrumb-current">{selectedCategory}</span>
              </>
            )}
          </nav>

          {/* Decorative Circuit Board Graphic on the top right */}
          <svg
            className="circuit-bg-decor"
            viewBox="0 0 450 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 60 H 120 L 160 20 H 260 L 300 60 H 450"
              stroke="#93c5fd"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <path
              d="M80 80 H 180 L 220 40 H 380 L 410 70 H 450"
              stroke="#60a5fa"
              strokeWidth="1.2"
              opacity="0.35"
            />
            <circle cx="160" cy="20" r="3.5" fill="#3b82f6" opacity="0.6" />
            <circle cx="260" cy="20" r="3" fill="#3b82f6" opacity="0.6" />
            <circle cx="300" cy="60" r="3.5" fill="#3b82f6" opacity="0.6" />
            <circle cx="220" cy="40" r="3" fill="#60a5fa" opacity="0.5" />
            <circle cx="380" cy="40" r="3.5" fill="#60a5fa" opacity="0.5" />
            <path
              d="M200 60 V 90 H 280"
              stroke="#bfdbfe"
              strokeWidth="1.5"
              opacity="0.4"
            />
            <circle cx="280" cy="90" r="3" fill="#93c5fd" opacity="0.5" />
          </svg>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="container products-layout-wrapper">
        {/* Mobile Filter Button */}
        <div className="mobile-filter-trigger-bar">
          <button
            type="button"
            className="btn-mobile-filter"
            onClick={() => setMobileFilterOpen(true)}
          >
            <i className="bi bi-funnel"></i>
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="mobile-filter-badge">{activeFiltersCount}</span>
            )}
          </button>
        </div>

        <div className="row g-4">
          {/* ================= DESKTOP SIDEBAR ================= */}
          <div className="col-lg-3 desktop-sidebar-col">
            <aside className="products-sidebar">
              <FilterContent />
            </aside>
          </div>

          {/* ================= PRODUCTS CONTENT AREA ================= */}
          <div className="col-lg-9">
            {/* Active search filter tag */}
            {searchQuery && (
              <div className="active-search-badge">
                <span>
                  Search results for: <strong>"{searchQuery}"</strong>
                </span>
                <button
                  type="button"
                  className="active-search-clear"
                  onClick={() => setSearchParams({})}
                  title="Clear search"
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              </div>
            )}

            {/* Top Control Bar */}
            <div className="products-content-header">
              <p className="product-count-text">
                Showing{" "}
                <strong>
                  {totalItems === 0
                    ? 0
                    : `${startIndex + 1}-${Math.min(
                        startIndex + ITEMS_PER_PAGE,
                        totalItems
                      )}`}
                </strong>{" "}
                of <strong>{totalItems}</strong> products
              </p>

              <div className="products-controls-right">
                {/* Sort dropdown */}
                <div className="sort-select-wrapper">
                  <select
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Sort by: Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Rating: High to Low</option>
                    <option value="popular">Popularity</option>
                  </select>
                  <i className="bi bi-chevron-down sort-chevron"></i>
                </div>

                {/* View mode toggle */}
                <div className="view-mode-toggles">
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <i className="bi bi-grid-fill"></i>
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <i className="bi bi-list-ul"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Products Rendering or Loading Skeleton */}
            {isLoading ? (
              <div className="products-grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonCard key={index} imageHeight={180} lines={3} />
                ))}
              </div>
            ) : currentProducts.length === 0 ? (
              <div className="no-products-found">
                <div className="no-products-icon">
                  <i className="bi bi-search"></i>
                </div>
                <h3>No products found</h3>
                <p>
                  We couldn't find any products matching your current filters.
                  Try clearing some filters or searching for something else.
                </p>
                <button
                  type="button"
                  className="btn-clear-filters"
                  style={{ maxWidth: "220px", margin: "0 auto" }}
                  onClick={clearAllFilters}
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="products-grid">
                {currentProducts.map((product) => {
                  const isImageLoaded = loadedImages[product.id];
                  const isAdded = addedCartIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="product-card"
                      onClick={() => handleCardClick(product.id)}
                    >
                      {/* Badge if available */}
                      {product.tag && (
                        <span
                          className={`product-badge ${product.tag.toLowerCase()}`}
                        >
                          {product.tag}
                        </span>
                      )}

                      {/* Product Image */}
                      <div className="product-image-box">
                        {!isImageLoaded && <div className="skeleton product-img-skeleton" />}
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-img"
                          loading="lazy"
                          onLoad={() => handleImageLoad(product.id)}
                          onError={() => handleImageLoad(product.id)}
                          style={{
                            opacity: isImageLoaded ? 1 : 0.8,
                            transition: "opacity 0.2s ease",
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="product-card-body">
                        <h4 className="product-card-title" title={product.name}>
                          {product.name}
                        </h4>

                        <div className="product-price-row">
                          <span className="product-price">
                            ₹{product.price.toLocaleString()}
                          </span>
                        </div>

                        {/* Bottom Row: Rating / Colors on Left, Cart Button on Right */}
                        <div className="product-bottom-row">
                          <div className="product-bottom-left">
                            <div className="product-rating-row">
                              <div className="rating-stars-row">
                                {renderStars(product.rating)}
                              </div>
                              <span className="product-review-count">
                                ({product.reviewCount})
                              </span>
                            </div>

                            {/* Color swatches if any */}
                            {product.colors && (
                              <div className="product-colors-row">
                                {product.colors.map((c, i) => (
                                  <span
                                    key={i}
                                    className="color-dot"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                                {product.extraColorsCount && (
                                  <span className="color-extra-text">
                                    +{product.extraColorsCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className={`btn-add-cart ${isAdded ? "added" : ""}`}
                            onClick={(e) => handleAddToCart(e, product)}
                            title="Add to Cart"
                          >
                            <i
                              className={`bi ${
                                isAdded ? "bi-check2" : "bi-cart3"
                              }`}
                            ></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="products-list">
                {currentProducts.map((product) => {
                  const isImageLoaded = loadedImages[product.id];
                  const isAdded = addedCartIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      className="product-card-list"
                      onClick={() => handleCardClick(product.id)}
                    >
                      <div className="product-image-box">
                        {!isImageLoaded && <div className="skeleton product-img-skeleton" />}
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-img"
                          loading="lazy"
                          onLoad={() => handleImageLoad(product.id)}
                          onError={() => handleImageLoad(product.id)}
                          style={{
                            opacity: isImageLoaded ? 1 : 0.8,
                            transition: "opacity 0.2s ease",
                          }}
                        />
                      </div>

                      <div className="product-card-body">
                        {product.tag && (
                          <span
                            className={`product-badge ${product.tag.toLowerCase()}`}
                            style={{ position: "static", display: "inline-block", marginBottom: "0.4rem" }}
                          >
                            {product.tag}
                          </span>
                        )}
                        <h4 className="product-card-title">{product.name}</h4>
                        <div className="product-rating-row">
                          <div className="rating-stars-row">
                            {renderStars(product.rating)}
                          </div>
                          <span className="product-review-count">
                            ({product.reviewCount} reviews)
                          </span>
                        </div>
                        <p className="product-desc-snippet">{product.description}</p>
                      </div>

                      <div className="product-card-side">
                        <div className="product-price-row">
                          <span className="product-price">
                            ₹{product.price.toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`btn-add-cart ${isAdded ? "added" : ""}`}
                          onClick={(e) => handleAddToCart(e, product)}
                          style={{ width: "42px", height: "42px" }}
                          title="Add to Cart"
                        >
                          <i
                            className={`bi ${
                              isAdded ? "bi-check2" : "bi-cart3"
                            }`}
                          ></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
              <div className="pagination-wrapper">
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-btn ${
                          currentPage === pageNum ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span key={pageNum} className="page-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= TRUST BADGES BAR ================= */}
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

      {/* ================= MOBILE FILTER DRAWER ================= */}
      <div className={`mobile-filter-drawer ${mobileFilterOpen ? "open" : ""}`}>
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileFilterOpen(false)}
        />
        <div className="mobile-drawer-panel">
          <div className="mobile-drawer-header">
            <h3>Filters</h3>
            <button
              type="button"
              className="btn-drawer-close"
              onClick={() => setMobileFilterOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <div className="mobile-drawer-content">
            <FilterContent />
          </div>
          <div className="mobile-drawer-footer">
            <button
              type="button"
              className="btn-pd-buy-now w-100"
              onClick={() => setMobileFilterOpen(false)}
            >
              Apply Filters ({totalItems})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
