import api from "./api.js";

export const normalizeProduct = (product = {}) => {
  const image =
    product.primary_image ||
    product.image_url ||
    product.image ||
    product.images?.find?.((img) => img.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    "/images/products/01.png";

  const comparePrice = Number(product.compare_price || product.originalPrice || 0);
  const price = Number(product.price || 0);

  return {
    ...product,
    id: product.id,
    name: product.name || product.title || "Product",
    slug: product.slug,
    subtitle: product.tagline || product.short_description || product.subtitle || "",
    description: product.description || product.short_description || "",
    image,
    gallery: product.images?.map((img) => img.image_url) || product.gallery || [image],
    price,
    originalPrice: comparePrice > price ? comparePrice : product.originalPrice,
    category: product.category_name || product.category || "",
    category_slug: product.category_slug,
    brand: product.brand_name || product.brand || "",
    rating: Number(product.avg_rating || product.rating || 0),
    reviewCount: Number(product.review_count || product.reviewCount || 0),
    availability: Number(product.stock || 0) > 0 ? "In Stock" : "Out of Stock",
    tag:
      product.badge ||
      (product.is_bestseller ? "Bestseller" : product.is_new ? "New" : product.tag || ""),
    keyFeatures: product.key_features || product.keyFeatures || [],
    faqs: (product.faqs || []).map((faq) => ({
      q: faq.q || faq.question,
      a: faq.a || faq.answer,
    })),
  };
};

const catalogService = {
  getHome: () => api.get("/home"),
  getProducts: (params = {}) => api.get("/products", { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get("/categories"),
  checkPincode: (pincode) => api.post("/products/check-pincode", { pincode }),
};

export default catalogService;
