import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BarChart3,
  Box,
  ClipboardList,
  Cuboid,
  Layers,
  Palette,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Plus,
  Pencil,
  Tag,
  Trash2,
  Power,
  Users,
  X,
  Eye,
  User,
  MapPin,
  CreditCard,
  FileText,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Download,
  BadgePercent,
  Star,
  Mail,
  MessageSquare,
  Settings2,
  Store,
  Link2,
  Image as ImageIcon,
  Globe2,
} from "lucide-react";
import adminService from "../services/admin.service";
import "../../public/css/admin.css";

const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const statusOptions = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const printStatusOptions = [
  "pending",
  "reviewing",
  "in_production",
  "printing",
  "quality_check",
  "shipped",
  "delivered",
  "cancelled",
];

/* ===== Helper: parse newline separated fields from admin forms ===== */
const parseLines = (text = "") => text.split("\n").map((s) => s.trim()).filter(Boolean);

const parseSpecs = (text = "") => {
  const specs = {};
  parseLines(text).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) specs[key] = value;
    }
  });
  return specs;
};

const parseResources = (text = "") =>
  parseLines(text)
    .map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length >= 2) {
        return parts.length >= 3
          ? { name: parts[0], type: parts[1], url: parts.slice(2).join("|") }
          : { name: parts[0], type: "link", url: parts[parts.length - 1] };
      }
      return null;
    })
    .filter(Boolean);

const parseFaqs = (text = "") =>
  parseLines(text)
    .map((line) => {
      const idx = line.indexOf("|");
      if (idx > 0) {
        return { q: line.slice(0, idx).trim(), a: line.slice(idx + 1).trim() };
      }
      return null;
    })
    .filter(Boolean);

const specsToText = (specs) => {
  if (!specs) return "";
  if (Array.isArray(specs)) {
    return specs
      .map((pair) => (pair && pair.label ? `${pair.label}: ${pair.value}` : ""))
      .filter(Boolean)
      .join("\n");
  }
  return Object.entries(specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
};

const resourcesToText = (resources) => {
  if (!resources) return "";
  return resources
    .map((r) => (r && r.name ? `${r.name} | ${r.type || "link"} | ${r.url || ""}` : ""))
    .filter(Boolean)
    .join("\n");
};

function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [printSubTab, setPrintSubTab] = useState("orders");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [printStatusFilter, setPrintStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({});
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [printOrders, setPrintOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [colors, setColors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [salesChart, setSalesChart] = useState({ monthlySales: [], statusDistribution: [] });
  const [activeModal, setActiveModal] = useState(null);
  const [editing, setEditing] = useState(null); // { type, id } when editing an existing record
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [selectedPrintOrderDetail, setSelectedPrintOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    tagline: "",
    category_id: "",
    brand_id: "",
    price: "",
    compare_price: "",
    stock: "",
    short_description: "",
    description: "",
    keyFeaturesText: "",
    specificationsText: "",
    applicationsText: "",
    resourcesText: "",
    faqsText: "",
    pinout_description: "",
    pinoutImageFile: null,
    galleryFiles: [],
    is_featured: false,
    is_active: true,
  });
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: 0,
    max_discount: "",
    usage_limit: "",
    valid_from: "",
    valid_until: "",
    is_active: true,
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", is_active: true });
  const [materialForm, setMaterialForm] = useState({
    name: "",
    code: "",
    description: "",
    price_per_gram: "",
    density_g_cm3: "1.24",
    is_active: true,
  });
  const [colorForm, setColorForm] = useState({
    name: "",
    hex_code: "#0b6bdc",
    is_active: true,
  });
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "customer",
    is_active: true,
  });
  const [brandForm, setBrandForm] = useState({
    name: "",
    description: "",
    website_url: "",
    logoFile: null,
    is_active: true,
  });
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    link_url: "",
    button_text: "Shop Now",
    sort_order: 0,
    imageFile: null,
    is_active: true,
  });
  const [settingsForm, setSettingsForm] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        productsRes,
        ordersRes,
        printOrdersRes,
        usersRes,
        couponsRes,
        categoriesRes,
        materialsRes,
        colorsRes,
        brandsRes,
        reviewsRes,
        subscribersRes,
        contactsRes,
        bannersRes,
        settingsRes,
        salesChartRes,
      ] = await Promise.all([
        adminService.getStats(),
        adminService.getProducts({ limit: 50 }),
        adminService.getOrders({ limit: 50 }),
        adminService.getPrintOrders({ limit: 50 }),
        adminService.getUsers({ limit: 50 }),
        adminService.getCoupons(),
        adminService.getCategories(),
        adminService.getMaterials(),
        adminService.getColors(),
        adminService.getBrands(),
        adminService.getReviews({ limit: 50 }),
        adminService.getSubscribers({ limit: 50 }),
        adminService.getContacts({ limit: 50 }),
        adminService.getBanners(),
        adminService.getSettings(),
        adminService.getSalesChart(),
      ]);

      setStats(statsRes.data.data || {});
      setProducts(productsRes.data.data?.products || []);
      setOrders(ordersRes.data.data?.orders || []);
      setPrintOrders(printOrdersRes.data.data?.orders || []);
      setUsers(usersRes.data.data?.users || []);
      setCoupons(couponsRes.data.data || []);
      setCategories(categoriesRes.data.categories || []);
      setMaterials(materialsRes.data.data || []);
      setColors(colorsRes.data.data || []);
      setBrands(brandsRes.data.data || []);
      setReviews(reviewsRes.data.data?.reviews || []);
      setSubscribers(subscribersRes.data.data?.subscribers || []);
      setContacts(contactsRes.data.data?.messages || []);
      setBanners(bannersRes.data.data || bannersRes.data.banners || []);
      const settingsMap = settingsRes.data.data || {};
      setSiteSettings(settingsMap);
      setSalesChart({
        monthlySales: salesChartRes.data?.data?.monthlySales || [],
        statusDistribution: salesChartRes.data?.data?.statusDistribution || [],
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.category_name, product.brand_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [products, search]);

  const resetProductForm = () => {
    setProductForm({
      name: "",
      sku: "",
      tagline: "",
      category_id: "",
      brand_id: "",
      price: "",
      compare_price: "",
      stock: "",
      short_description: "",
      description: "",
      keyFeaturesText: "",
      specificationsText: "",
      applicationsText: "",
      resourcesText: "",
      faqsText: "",
      pinout_description: "",
      pinoutImageFile: null,
      galleryFiles: [],
      is_featured: false,
      is_active: true,
    });
  };

  const closeModal = () => {
    setEditing(null);
    setActiveModal(null);
  };

  /* ===== Build FormData for product create/update (supports image uploads) ===== */
  const buildProductFormData = () => {
    const form = new FormData();
    const append = (key, value) => {
      if (value !== undefined && value !== null && value !== "") form.append(key, value);
    };
    append("name", productForm.name);
    append("sku", productForm.sku);
    append("tagline", productForm.tagline);
    append("category_id", productForm.category_id);
    append("brand_id", productForm.brand_id);
    append("price", productForm.price);
    append("compare_price", productForm.compare_price);
    append("stock", productForm.stock);
    append("short_description", productForm.short_description);
    append("description", productForm.description);
    append("pinout_description", productForm.pinout_description);
    append("key_features", JSON.stringify(parseLines(productForm.keyFeaturesText)));
    append("specifications", JSON.stringify(parseSpecs(productForm.specificationsText)));
    append("applications", JSON.stringify(parseLines(productForm.applicationsText)));
    append("resources", JSON.stringify(parseResources(productForm.resourcesText)));
    append("faqs", JSON.stringify(parseFaqs(productForm.faqsText)));
    append("is_featured", productForm.is_featured ? "true" : "false");
    append("is_active", productForm.is_active ? "true" : "false");
    if (productForm.pinoutImageFile) append("pinout_image", productForm.pinoutImageFile);
    (productForm.galleryFiles || []).forEach((file) => append("images", file));
    return form;
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    if (!productForm.name || !productForm.category_id || productForm.price === "") {
      toast.error("Product name, category, and price are required");
      return;
    }
    try {
      const payload = buildProductFormData();
      if (editing?.id) {
        await adminService.updateProduct(editing.id, payload);
        toast.success("Product updated");
      } else {
        await adminService.createProduct(payload);
        toast.success("Product created");
      }
      closeModal();
      resetProductForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Product save failed");
    }
  };

  const openEditProduct = async (id) => {
    try {
      const res = await adminService.getProductById(id);
      const p = res.data.data || {};
      setProductForm({
        name: p.name || "",
        sku: p.sku || "",
        tagline: p.tagline || "",
        category_id: p.category_id || "",
        brand_id: p.brand_id || "",
        price: p.price || "",
        compare_price: p.compare_price || "",
        stock: p.stock ?? "",
        short_description: p.short_description || "",
        description: p.description || "",
        keyFeaturesText: (Array.isArray(p.key_features) ? p.key_features : []).join("\n"),
        specificationsText: specsToText(p.specifications),
        applicationsText: (Array.isArray(p.applications) ? p.applications : []).join("\n"),
        resourcesText: resourcesToText(p.resources),
        faqsText: (Array.isArray(p.faqs) ? p.faqs : [])
          .map((f) => `${f.q || f.question || ""}|${f.a || f.answer || ""}`)
          .join("\n"),
        pinout_description: p.pinout_description || "",
        pinoutImageFile: null,
        galleryFiles: [],
        is_featured: Boolean(p.is_featured),
        is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
      });
      setEditing({ type: "product", id });
      setActiveModal("product");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load product");
    }
  };

  const updateProduct = async (id, patch) => {
    try {
      await adminService.updateProduct(id, patch);
      toast.success("Product updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Product update failed");
    }
  };

  const resetCouponForm = () => {
    setCouponForm({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: 0,
      max_discount: "",
      usage_limit: "",
      valid_from: "",
      valid_until: "",
      is_active: true,
    });
  };

  const submitCoupon = async (event) => {
    event.preventDefault();
    if (!couponForm.code || couponForm.discount_value === "") {
      toast.error("Coupon code and discount value are required");
      return;
    }
    try {
      if (editing?.id) {
        await adminService.updateCoupon(editing.id, couponForm);
        toast.success("Coupon updated");
      } else {
        await adminService.createCoupon(couponForm);
        toast.success("Coupon created");
      }
      closeModal();
      resetCouponForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Coupon save failed");
    }
  };

  const openEditCoupon = (coupon) => {
    setCouponForm({
      code: coupon.code || "",
      discount_type: coupon.discount_type || "percentage",
      discount_value: coupon.discount_value || "",
      min_order_amount: coupon.min_order_amount || 0,
      max_discount: coupon.max_discount || "",
      usage_limit: coupon.usage_limit || "",
      valid_from: coupon.valid_from ? String(coupon.valid_from).slice(0, 10) : "",
      valid_until: coupon.valid_until ? String(coupon.valid_until).slice(0, 10) : "",
      is_active: coupon.is_active !== undefined ? Boolean(coupon.is_active) : true,
    });
    setEditing({ type: "coupon", id: coupon.id });
    setActiveModal("coupon");
  };

  const deleteCoupon = async (id) => {
    try {
      await adminService.deleteCoupon(id);
      toast.success("Coupon deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Coupon delete failed");
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", description: "", is_active: true });
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    if (!categoryForm.name) {
      toast.error("Category name is required");
      return;
    }
    try {
      if (editing?.id) {
        await adminService.updateCategory(editing.id, categoryForm);
        toast.success("Category updated");
      } else {
        await adminService.createCategory(categoryForm);
        toast.success("Category created");
      }
      closeModal();
      resetCategoryForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Category save failed");
    }
  };

  const openEditCategory = (category) => {
    setCategoryForm({
      name: category.name || "",
      description: category.description || "",
      is_active: category.is_active !== undefined ? Boolean(category.is_active) : true,
    });
    setEditing({ type: "category", id: category.id });
    setActiveModal("category");
  };

  const deleteCategory = async (id) => {
    try {
      await adminService.deleteCategory(id);
      toast.success("Category deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Category delete failed");
    }
  };

  const resetMaterialForm = () => {
    setMaterialForm({
      name: "",
      code: "",
      description: "",
      price_per_gram: "",
      density_g_cm3: "1.24",
      is_active: true,
    });
  };

  const submitMaterial = async (event) => {
    event.preventDefault();
    if (!materialForm.name || materialForm.price_per_gram === "") {
      toast.error("Material name and price per gram are required");
      return;
    }
    try {
      const payload = {
        ...materialForm,
        code: materialForm.code || materialForm.name.slice(0, 4),
        price_per_gram: Number(materialForm.price_per_gram),
        density_g_cm3: Number(materialForm.density_g_cm3 || 1.24),
      };
      if (editing?.id) {
        await adminService.updateMaterial(editing.id, payload);
        toast.success("Material updated");
      } else {
        await adminService.createMaterial(payload);
        toast.success("Material created");
      }
      closeModal();
      resetMaterialForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Material save failed");
    }
  };

  const openEditMaterial = (material) => {
    setMaterialForm({
      name: material.name || "",
      code: material.code || material.slug || "",
      description: material.description || "",
      price_per_gram: material.price_per_gram || "",
      density_g_cm3: material.density_g_cm3 || "1.24",
      is_active: material.is_active !== undefined ? Boolean(material.is_active) : true,
    });
    setEditing({ type: "material", id: material.id });
    setActiveModal("material");
  };

  const updateMaterial = async (id, patch) => {
    try {
      await adminService.updateMaterial(id, patch);
      toast.success("Material updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Material update failed");
    }
  };

  const deleteMaterial = async (id) => {
    try {
      await adminService.deleteMaterial(id);
      toast.success("Material deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Material delete failed");
    }
  };

  const resetColorForm = () => {
    setColorForm({ name: "", hex_code: "#0b6bdc", is_active: true });
  };

  const submitColor = async (event) => {
    event.preventDefault();
    if (!colorForm.name) {
      toast.error("Color name is required");
      return;
    }
    try {
      if (editing?.id) {
        await adminService.updateColor(editing.id, colorForm);
        toast.success("Color updated");
      } else {
        await adminService.createColor(colorForm);
        toast.success("Color created");
      }
      closeModal();
      resetColorForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Color save failed");
    }
  };

  const openEditColor = (color) => {
    setColorForm({
      name: color.name || "",
      hex_code: color.hex_code || "#0b6bdc",
      is_active: color.is_active !== undefined ? Boolean(color.is_active) : true,
    });
    setEditing({ type: "color", id: color.id });
    setActiveModal("color");
  };

  const updateColor = async (id, patch) => {
    try {
      await adminService.updateColor(id, patch);
      toast.success("Color updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Color update failed");
    }
  };

  const deleteColor = async (id) => {
    try {
      await adminService.deleteColor(id);
      toast.success("Color deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Color delete failed");
    }
  };

  const submitUser = async (event) => {
    event.preventDefault();
    if (!userForm.first_name || !userForm.last_name || !userForm.email) {
      toast.error("First name, last name, and email are required");
      return;
    }
    try {
      await adminService.updateUser(editing?.id, userForm);
      toast.success("User updated");
      closeModal();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "User update failed");
    }
  };

  const openEditUser = (user) => {
    setUserForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "customer",
      is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
    });
    setEditing({ type: "user", id: user.id });
    setActiveModal("user");
  };

  /* ===================== BRANDS ===================== */
  const resetBrandForm = () => {
    setBrandForm({
      name: "",
      description: "",
      website_url: "",
      logoFile: null,
      is_active: true,
    });
  };

  const submitBrand = async (event) => {
    event.preventDefault();
    if (!brandForm.name) {
      toast.error("Brand name is required");
      return;
    }
    try {
      const form = new FormData();
      form.append("name", brandForm.name);
      form.append("description", brandForm.description || "");
      form.append("website_url", brandForm.website_url || "");
      form.append("is_active", brandForm.is_active ? "true" : "false");
      if (brandForm.logoFile) form.append("logo", brandForm.logoFile);

      if (editing?.id) {
        await adminService.updateBrand(editing.id, form);
        toast.success("Brand updated");
      } else {
        await adminService.createBrand(form);
        toast.success("Brand created");
      }
      closeModal();
      resetBrandForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Brand save failed");
    }
  };

  const openEditBrand = (brand) => {
    setBrandForm({
      name: brand.name || "",
      description: brand.description || "",
      website_url: brand.website_url || "",
      logoFile: null,
      is_active: brand.is_active !== undefined ? Boolean(brand.is_active) : true,
    });
    setEditing({ type: "brand", id: brand.id });
    setActiveModal("brand");
  };

  const updateBrand = async (id, patch) => {
    try {
      await adminService.updateBrand(id, patch);
      toast.success("Brand updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Brand update failed");
    }
  };

  const deleteBrand = async (id) => {
    try {
      await adminService.deleteBrand(id);
      toast.success("Brand deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Brand delete failed");
    }
  };

  /* ===================== REVIEWS ===================== */
  const toggleReview = async (id, isApproved) => {
    try {
      await adminService.toggleReviewApproval(id, { is_approved: !isApproved });
      toast.success("Review updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Review update failed");
    }
  };

  const deleteReview = async (id) => {
    try {
      await adminService.deleteReview(id);
      toast.success("Review deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Review delete failed");
    }
  };

  /* ===================== NEWSLETTER SUBSCRIBERS ===================== */
  const deleteSubscriber = async (id) => {
    try {
      await adminService.deleteSubscriber(id);
      toast.success("Subscriber removed");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Subscriber removal failed");
    }
  };

  /* ===================== CONTACT MESSAGES ===================== */
  const updateContact = async (id, status) => {
    try {
      await adminService.updateContactStatus(id, { status });
      toast.success("Message marked as " + status);
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Message update failed");
    }
  };

  const deleteContact = async (id) => {
    try {
      await adminService.deleteContact(id);
      toast.success("Message deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Message delete failed");
    }
  };

  /* ===================== HERO BANNERS ===================== */
  const resetBannerForm = () => {
    setBannerForm({
      title: "",
      subtitle: "",
      link_url: "",
      button_text: "Shop Now",
      sort_order: 0,
      imageFile: null,
      is_active: true,
    });
  };

  const submitBanner = async (event) => {
    event.preventDefault();
    if (editing?.id && !bannerForm.imageFile) {
      toast.error("A banner image is required. Pick a file or cancel.");
      return;
    }
    if (!editing?.id && !bannerForm.imageFile) {
      toast.error("Banner image is required");
      return;
    }
    try {
      const form = new FormData();
      form.append("title", bannerForm.title || "");
      form.append("subtitle", bannerForm.subtitle || "");
      form.append("link_url", bannerForm.link_url || "");
      form.append("button_text", bannerForm.button_text || "Shop Now");
      form.append("sort_order", bannerForm.sort_order || 0);
      form.append("is_active", bannerForm.is_active ? "true" : "false");
      if (bannerForm.imageFile) form.append("image", bannerForm.imageFile);

      if (editing?.id) {
        await adminService.updateBanner(editing.id, form);
        toast.success("Banner updated");
      } else {
        await adminService.createBanner(form);
        toast.success("Banner created");
      }
      closeModal();
      resetBannerForm();
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Banner save failed");
    }
  };

  const openEditBanner = (banner) => {
    setBannerForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      link_url: banner.link_url || "",
      button_text: banner.button_text || "Shop Now",
      sort_order: banner.sort_order || 0,
      imageFile: null,
      is_active: banner.is_active !== undefined ? Boolean(banner.is_active) : true,
    });
    setEditing({ type: "banner", id: banner.id });
    setActiveModal("banner");
  };

  const updateBanner = async (id, patch) => {
    try {
      await adminService.updateBanner(id, patch);
      toast.success("Banner updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Banner update failed");
    }
  };

  const deleteBanner = async (id) => {
    try {
      await adminService.deleteBanner(id);
      toast.success("Banner deleted");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Banner delete failed");
    }
  };

  /* ===================== SITE SETTINGS ===================== */
  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

  const updateSettingField = (key, value) => {
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitSettings = async (event) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      await adminService.updateSettings(settingsForm);
      toast.success("Settings saved");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Settings save failed");
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateOrder = async (id, status) => {
    try {
      await adminService.updateOrderStatus(id, { status });
      toast.success("Order status updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Order update failed");
    }
  };

  const updateOrderDetails = async (id, patch) => {
    try {
      await adminService.updateOrderStatus(id, patch);
      toast.success("Order updated");
      loadAdminData();
      loadOrderDetails(id);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Order update failed");
    }
  };

  const updatePrintOrder = async (id, status) => {
    try {
      await adminService.updatePrintOrderStatus(id, { status });
      toast.success("Print order status updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Print order update failed");
    }
  };

  const updatePrintOrderNotes = async (id, value) => {
    try {
      await adminService.updatePrintOrderStatus(id, {
        admin_notes: value?.trim() || null,
      });
      toast.success("Print order notes updated");
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Print order notes update failed");
    }
  };

  const loadOrderDetails = async (orderId) => {
    setDetailLoading(true);
    try {
      const res = await adminService.getOrderDetails(orderId);
      setSelectedOrderDetail(res.data.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load order details");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadPrintOrderDetails = async (orderId) => {
    setDetailLoading(true);
    try {
      const res = await adminService.getPrintOrderDetails(orderId);
      setSelectedPrintOrderDetail(res.data.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load print order details");
    } finally {
      setDetailLoading(false);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
    { id: "products", label: "Products", Icon: Box },
    { id: "orders", label: "Orders", Icon: ClipboardList },
    { id: "printing", label: "3D Printing", Icon: Cuboid },
    { id: "users", label: "Users", Icon: Users },
    { id: "coupons", label: "Coupons", Icon: Tag },
    { id: "catalog", label: "Catalog", Icon: Layers },
    { id: "brands", label: "Brands", Icon: Store },
    { id: "reviews", label: "Reviews", Icon: Star },
    { id: "subscribers", label: "Subscribers", Icon: Mail },
    { id: "contacts", label: "Inquiries", Icon: MessageSquare },
    { id: "settings", label: "Settings", Icon: Settings2 },
  ];

  const navGroups = [
    { label: "Overview", ids: ["dashboard"] },
    { label: "Sales", ids: ["orders", "printing", "coupons"] },
    { label: "Catalog", ids: ["products", "catalog", "brands", "reviews"] },
    { label: "Customers", ids: ["users", "subscribers", "contacts"] },
    { label: "System", ids: ["settings"] },
  ];

  const tabById = Object.fromEntries(tabs.map((tab) => [tab.id, tab]));

  const printSubTabs = [
    { id: "orders", label: "3D Printing Orders", count: printOrders.length },
    { id: "colors", label: "Colors", count: colors.length },
    { id: "materials", label: "Materials", count: materials.length },
  ];

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand">
          <img src="/images/logo.png" alt="Printy Nozzles" />
          <span className="admin-brand-text">
            <strong>Admin</strong>
            <small>PrintyNozzle Control Room</small>
          </span>
        </Link>
        <nav className="admin-tabs">
          {navGroups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-label">{group.label}</span>
              {group.ids.map((id) => {
                const { label, Icon } = tabById[id];
                return (
                  <button
                    type="button"
                    key={id}
                    className={`admin-tab ${activeTab === id ? "active" : ""}`}
                    onClick={() => {
                      setActiveTab(id);
                      setSelectedOrderDetail(null);
                      setSelectedPrintOrderDetail(null);
                      setOrderStatusFilter("all");
                      setPrintStatusFilter("all");
                    }}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {id === "contacts" && contacts.length > 0 && (
                      <em className="admin-tab-badge">{contacts.length}</em>
                    )}
                    {id === "reviews" && reviews.length > 0 && (
                      <em className="admin-tab-badge">{reviews.length}</em>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <Link to="/" className="admin-store-link">
            <Store size={15} />
            <span>View Store</span>
          </Link>
          <span className="admin-side-note">Signed in as store admin</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">PrintyNozzle Control Room</span>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            <p className="admin-header-sub">
              {{
                dashboard: "Live store performance, revenue and order health at a glance.",
                products: "Manage your storefront catalog, pricing, stock and visibility.",
                orders: "Track, fulfil and update every customer order.",
                printing: "Custom 3D print jobs, materials and colors.",
                users: "Customers and admin access in one place.",
                coupons: "Discount codes that grow average order value.",
                catalog: "Categories that organize the storefront.",
                brands: "Brands shoppers can filter and trust.",
                reviews: "Approve and moderate customer reviews.",
                subscribers: "Newsletter audience and retention.",
                contacts: "Customer inquiries waiting for a reply.",
                settings: "Store configuration, shipping, tax and content.",
              }[activeTab] || "Manage your store."}
            </p>
            <span className="admin-header-meta">
              <i className="admin-live-dot" />
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="admin-refresh" onClick={loadAdminData}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="admin-empty">Loading admin data...</div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <>
                <section className="admin-stat-grid">
                  {[
                    ["Revenue", money(stats.totalRevenue), BarChart3, "Paid orders", "linear-gradient(135deg,#0759d6,#3f9bff)", "rgba(7,89,214,.28)"],
                    ["Orders", stats.totalOrders || 0, ClipboardList, "All product orders", "linear-gradient(135deg,#7c3aed,#a78bfa)", "rgba(124,58,237,.28)"],
                    ["3D Print Orders", stats.totalPrintOrders || 0, Cuboid, "Custom print jobs", "linear-gradient(135deg,#ea580c,#ffb21f)", "rgba(234,88,12,.28)"],
                    ["Customers", stats.totalUsers || 0, Users, "Registered users", "linear-gradient(135deg,#059669,#34d399)", "rgba(5,150,105,.28)"],
                    ["Products", stats.totalProducts || 0, Box, "Live catalog", "linear-gradient(135deg,#0284c7,#38bdf8)", "rgba(2,132,199,.28)"],
                    ["Low Stock", stats.lowStockCount || 0, ShieldCheck, "Needs restock", "linear-gradient(135deg,#dc2626,#f87171)", "rgba(220,38,38,.28)"],
                  ].map(([label, value, Icon, hint, ico, glow]) => (
                    <article
                      className="admin-stat"
                      key={label}
                      style={{ "--ad-ico": ico, "--ad-glow": glow }}
                    >
                      <span className="admin-stat-ico">
                        <Icon size={21} />
                      </span>
                      <span className="admin-stat-label">{label}</span>
                      <strong>{value}</strong>
                      <span className="admin-stat-hint">{hint}</span>
                    </article>
                  ))}
                </section>

<section className="admin-grid two">
                  <div className="admin-panel">
                    <div className="admin-panel-title-row">
                      <div>
                        <h2>Revenue this year</h2>
                        <p className="admin-panel-subtitle">Paid & delivered orders per month.</p>
                      </div>
                      <span className="admin-count-badge">
                        {money((salesChart.monthlySales || []).reduce((sum, m) => sum + Number(m.total_sales || 0), 0))} total
                      </span>
                    </div>
                    {(salesChart.monthlySales || []).length ? (
                      <AdminSalesChart monthlySales={salesChart.monthlySales} />
                    ) : (
                      <div className="admin-empty small">No sales data yet this year</div>
                    )}
                  </div>
                  <div className="admin-panel">
                    <div className="admin-panel-title-row">
                      <div>
                        <h2>Orders by status</h2>
                        <p className="admin-panel-subtitle">Live distribution across all product orders.</p>
                      </div>
                    </div>
                    {(salesChart.statusDistribution || []).length ? (
                      <div className="admin-dist-list">
                        {(() => {
                          const total = salesChart.statusDistribution.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
                          return salesChart.statusDistribution.map((row) => (
                            <div className="admin-dist-row" key={row.status}>
                              <span className={`admin-detail-status-badge ${row.status}`} style={{ fontSize: "0.7rem" }}>
                                {row.status?.replace(/_/g, " ")}
                              </span>
                              <div className="admin-dist-track">
                                <div
                                  className="admin-dist-fill"
                                  style={{ width: `${Math.max(4, (Number(row.count) / total) * 100)}%` }}
                                />
                              </div>
                              <strong>{row.count}</strong>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="admin-empty small">No orders yet</div>
                    )}
                  </div>
                </section>

                <section className="admin-grid two">
                  <div className="admin-panel">
                    <h2>Recent Orders</h2>
                    <AdminTable
                      columns={["Order", "Customer", "Status", "Total"]}
                      rows={(stats.recentOrders || []).map((order) => [
                        `#${order.order_number}`,
                        `${order.first_name || ""} ${order.last_name || ""}`.trim() || order.email,
                        order.status,
                        money(order.total_amount),
                      ])}
                      emptyMessage="No recent orders found"
                    />
                  </div>
                  <div className="admin-panel">
                    <h2>Top Products</h2>
                    <AdminTable
                      columns={["Product", "Stock", "Sold", "Price"]}
                      rows={(stats.topProducts || []).map((product) => [
                        product.name,
                        product.stock,
                        product.units_sold,
                        money(product.price),
                      ])}
                      emptyMessage="No top products found"
                    />
                  </div>
                </section>
              </>
            )}

            {activeTab === "products" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Products</h2>
                      <p className="admin-panel-subtitle">Manage backend products and review storefront catalog items.</p>
                    </div>
                    <div className="admin-actions">
                      <label className="admin-search">
                        <Search size={15} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
                      </label>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetProductForm(); setActiveModal("product"); }}>
                        <Plus size={16} />
                        <span>Add Product</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-product-list">
                    <div className="admin-product-head">
                      <span>Product</span>
                      <span>Category</span>
                      <span>Price</span>
                      <span>Stock</span>
                      <span>Action</span>
                    </div>
                    {filteredProducts.length ? (
                      filteredProducts.map((product) => {
                        const stockQty = Number(product.stock || 0);
                        const stockState = stockQty <= 0 ? "out" : stockQty <= 5 ? "low" : "in";
                        const stockLabel = stockQty <= 0 ? "Out of stock" : stockQty <= 5 ? `Low (${stockQty})` : "In stock";
                        const isActive = product.is_active ?? true;
                        return (
                          <article className={`admin-product-row ${isActive ? "" : "inactive"}`} key={product.id}>
                            <img src={product.primary_image || "/images/placeholder.png"} alt={product.name} />
                            <div className="admin-product-info">
                              <strong>{product.name}</strong>
                              <span>{product.sku || product.brand_name || "No SKU"}</span>
                            </div>
                            <span className="admin-muted-cell">{product.category_name || "Catalog"}{product.brand_name ? ` · ${product.brand_name}` : ""}</span>
                            <input
                              type="number"
                              defaultValue={product.price}
                              onBlur={(e) => updateProduct(product.id, { price: Number(e.target.value) })}
                              aria-label="Price"
                            />
                            <div className="admin-stock-cell">
                              <input
                                type="number"
                                defaultValue={product.stock}
                                onBlur={(e) => updateProduct(product.id, { stock: Number(e.target.value) })}
                                aria-label="Stock"
                              />
                              <span className="admin-stock-line">
                                <i className={`admin-stock-dot ${stockState}`} />
                                {stockLabel}
                              </span>
                            </div>
                            <div className="admin-row-actions">
                              <button
                                type="button"
                                className="admin-icon"
                                onClick={() => openEditProduct(product.id)}
                                title="Edit product details"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className={`admin-icon ${isActive ? "danger" : "success"}`}
                                onClick={() => updateProduct(product.id, { is_active: !isActive })}
                                title={isActive ? "Deactivate product" : "Activate product"}
                              >
                                <Power size={16} />
                              </button>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="admin-empty small">No products found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "orders" && !selectedOrderDetail && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Customer Orders</h2>
                      <p className="admin-panel-subtitle">Manage customer orders and update delivery status.</p>
                    </div>
                    <div className="admin-filter-bar">
                      <span className="admin-count-badge">{orders.length} orders</span>
                      <select
                        className="admin-filter-select"
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        aria-label="Filter orders by status"
                      >
                        <option value="all">All statuses</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="admin-list">
                    {(() => {
                      const visibleOrders = orders.filter(
                        (order) => orderStatusFilter === "all" || order.status === orderStatusFilter
                      );
                      if (!visibleOrders.length) {
                        return (
                          <div className="admin-empty small">
                            {orders.length ? `No orders with status "${orderStatusFilter}"` : "No customer orders yet"}
                          </div>
                        );
                      }
                      return visibleOrders.map((order) => (
                        <article
                          className="admin-order-row admin-order-clickable"
                          key={order.id}
                          onClick={(e) => {
                            if (e.target.tagName !== "SELECT" && e.target.tagName !== "OPTION") {
                              loadOrderDetails(order.id);
                            }
                          }}
                        >
                          <div className="admin-order-info-click" title="View order details">
                            <strong>#{order.order_number}</strong>
                            <span>{order.first_name} {order.last_name} | {order.item_count || 0} items</span>
                            <span className="admin-row-meta">
                              <span className={`admin-status-pill ${order.status}`}>{order.status}</span>
                              {order.payment_status && (
                                <span className="admin-count-badge" style={{ minHeight: 24 }}>
                                  {order.payment_status}
                                </span>
                              )}
                            </span>
                          </div>
                          <strong>{money(order.total_amount)}</strong>
                          <select
                            value={order.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateOrder(order.id, e.target.value);
                            }}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="admin-view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadOrderDetails(order.id);
                            }}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </article>
                      ));
                    })()}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "orders" && selectedOrderDetail && (
              <AdminOrderDetail
                order={selectedOrderDetail}
                loading={detailLoading}
                onBack={() => setSelectedOrderDetail(null)}
                onStatusUpdate={(id, status) => {
                  updateOrder(id, status);
                  loadOrderDetails(id);
                }}
                onTrackingUpdate={updateOrderDetails}
                statusOptions={statusOptions}
                money={money}
              />
            )}

            {activeTab === "printing" && (
              <section className="admin-printing-layout">
                <div className="admin-subtabs" role="tablist" aria-label="3D printing admin sections">
                  {printSubTabs.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      className={`admin-subtab ${printSubTab === tab.id ? "active" : ""}`}
                      onClick={() => {
                        setPrintSubTab(tab.id);
                        setSelectedPrintOrderDetail(null);
                      }}
                      role="tab"
                      aria-selected={printSubTab === tab.id}
                    >
                      <span>{tab.label}</span>
                      <strong>{tab.count}</strong>
                    </button>
                  ))}
                </div>

                {printSubTab === "orders" && !selectedPrintOrderDetail && (
                <div className="admin-panel admin-section-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>3D Print Orders</h2>
                      <p className="admin-panel-subtitle">Track custom print jobs and update production status.</p>
                    </div>
                    <div className="admin-filter-bar">
                      <span className="admin-count-badge">{printOrders.length} orders</span>
                      <select
                        className="admin-filter-select"
                        value={printStatusFilter}
                        onChange={(e) => setPrintStatusFilter(e.target.value)}
                        aria-label="Filter print orders by status"
                      >
                        <option value="all">All statuses</option>
                        {printStatusOptions.map((status) => (
                          <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="admin-list">
                    {(() => {
                      const visiblePrintOrders = printOrders.filter(
                        (order) => printStatusFilter === "all" || order.status === printStatusFilter
                      );
                      if (!visiblePrintOrders.length) {
                        return (
                          <div className="admin-empty small">
                            {printOrders.length ? `No print orders with status "${printStatusFilter.replace(/_/g, " ")}"` : "No 3D print orders yet"}
                          </div>
                        );
                      }
                      return visiblePrintOrders.map((order) => (
                      <article
                        className="admin-order-row admin-print-order-row admin-order-clickable"
                        key={order.id}
                        onClick={(e) => {
                          if (e.target.tagName !== "SELECT" && e.target.tagName !== "OPTION") {
                            loadPrintOrderDetails(order.id);
                          }
                        }}
                      >
                        <div className="admin-order-info-click" title="View order details">
                          <strong>#{order.order_number}</strong>
                          <span>{order.file_name} | {order.material_name || "Material"}</span>
                          <span className="admin-row-meta">
                            <span className={`admin-status-pill ${order.status}`}>{order.status?.replace(/_/g, " ")}</span>
                          </span>
                        </div>
                        <strong>{money(order.total_amount)}</strong>
                        <select
                          value={order.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            updatePrintOrder(order.id, e.target.value);
                          }}
                        >
                          {printStatusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="admin-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadPrintOrderDetails(order.id);
                          }}
                          title="View Details"
                        >
                          <Eye size={16} />
</button>
                        </article>
                      ));
                    })()}
                  </div>
                </div>
                )}

                {printSubTab === "orders" && selectedPrintOrderDetail && (
                  <AdminPrintOrderDetail
                    order={selectedPrintOrderDetail}
                    loading={detailLoading}
                    onBack={() => setSelectedPrintOrderDetail(null)}
                    onStatusUpdate={(id, status) => {
                      updatePrintOrder(id, status);
                      loadPrintOrderDetails(id);
                    }}
                    onNotesUpdate={(id, value) => {
                      updatePrintOrderNotes(id, value);
                      loadPrintOrderDetails(id);
                    }}
                    statusOptions={printStatusOptions}
                    money={money}
                  />
                )}

                {printSubTab === "materials" && (
                <div className="admin-panel admin-section-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Materials</h2>
                      <p className="admin-panel-subtitle">Control material code, density, active state, and price per gram.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{materials.length} types</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetMaterialForm(); setActiveModal("material"); }}>
                        <Plus size={16} />
                        <span>Add Material</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-material-list">
                    {materials.length ? (
                      materials.map((material) => (
                        <article className="admin-material-row" key={material.id}>
                          <div>
                            <strong>{material.name}</strong>
                            <span>{material.code || material.slug || "MATERIAL"}</span>
                          </div>
                          <label>
                            <span>Rs./g</span>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={material.price_per_gram}
                              onBlur={(e) => updateMaterial(material.id, { price_per_gram: Number(e.target.value) })}
                            />
                          </label>
                          <label>
                            <span>Density</span>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={material.density_g_cm3}
                              onBlur={(e) => updateMaterial(material.id, { density_g_cm3: Number(e.target.value) })}
                            />
                          </label>
                          <button
                            type="button"
                            className={`admin-toggle ${material.is_active ? "active" : ""}`}
                            onClick={() => updateMaterial(material.id, { is_active: !material.is_active })}
                          >
                            {material.is_active ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditMaterial(material)}
                            title="Edit material"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteMaterial(material.id)}
                            title="Delete material"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No materials found</div>
                    )}
                  </div>
                </div>
                )}

                {printSubTab === "colors" && (
                <div className="admin-panel admin-section-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Colors</h2>
                      <p className="admin-panel-subtitle">Manage visible colors for 3D print orders.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{colors.length} colors</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetColorForm(); setActiveModal("color"); }}>
                        <Plus size={16} />
                        <span>Add Color</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-color-grid">
                    {colors.length ? (
                      colors.map((color) => (
                        <article className="admin-color-row" key={color.id}>
                          <span className="admin-color-dot" style={{ backgroundColor: color.hex_code }} />
                          <div>
                            <strong>{color.name}</strong>
                            <span>{color.hex_code}</span>
                          </div>
                          <input
                            type="color"
                            defaultValue={color.hex_code || "#000000"}
                            onBlur={(e) => updateColor(color.id, { hex_code: e.target.value })}
                            aria-label={`${color.name} color`}
                          />
                          <button
                            type="button"
                            className={`admin-toggle ${color.is_active ? "active" : ""}`}
                            onClick={() => updateColor(color.id, { is_active: !color.is_active })}
                          >
                            {color.is_active ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditColor(color)}
                            title="Edit color"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteColor(color.id)}
                            title="Delete color"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No colors found</div>
                    )}
                  </div>
                </div>
                )}

              </section>
            )}

            {activeTab === "users" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Users</h2>
                      <p className="admin-panel-subtitle">Manage customer and administrative accounts.</p>
                    </div>
                    <span className="admin-count-badge">{users.length} users</span>
                  </div>
                  <div className="admin-list">
                    {users.length ? (
                      users.map((user) => (
                        <article className="admin-user-row" key={user.id} style={{ gridTemplateColumns: "44px minmax(0, 1fr) 180px 44px 110px" }}>
                          <div className="admin-avatar">{`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`}</div>
                          <div>
                            <strong>{user.first_name} {user.last_name}</strong>
                            <span>{user.email}</span>
                            <span className="admin-row-meta">
                              <span className={`admin-role-pill ${user.role === "admin" ? "admin" : "customer"}`}>{user.role}</span>
                              <span className={`admin-status-pill ${user.is_active ? "delivered" : "cancelled"}`}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditUser(user)}
                            title="Edit user"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-secondary"
                            onClick={() =>
                              adminService
                                .updateUser(user.id, { is_active: !user.is_active })
                                .then(() => {
                                  toast.success(`User ${user.is_active ? "deactivated" : "activated"}`);
                                  loadAdminData();
                                })
                                .catch((error) => toast.error(error?.response?.data?.message || "User update failed"))
                            }
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No users found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "coupons" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Coupons</h2>
                      <p className="admin-panel-subtitle">Create and review active promotional offers.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{coupons.length} coupons</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetCouponForm(); setActiveModal("coupon"); }}>
                        <Plus size={16} />
                        <span>Add Coupon</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-list">
                    {coupons.length ? (
                      coupons.map((coupon) => (
                        <article className="admin-user-row" key={coupon.id} style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 44px 44px" }}>
                          <div>
                            <strong><span className="admin-code-chip">{coupon.code}</span></strong>
                            <span>
                              {coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `${money(coupon.discount_value)} off`}
                              {" "}· Min: {money(coupon.min_order_amount)} · Used: {coupon.used_count || 0}/{coupon.usage_limit || "∞"}
                            </span>
                            {(coupon.valid_from || coupon.valid_until) && (
                              <span>
                                Valid {coupon.valid_from ? `from ${new Date(coupon.valid_from).toLocaleDateString("en-IN")}` : ""}
                                {coupon.valid_from && coupon.valid_until ? " " : ""}
                                {coupon.valid_until ? `until ${new Date(coupon.valid_until).toLocaleDateString("en-IN")}` : ""}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`admin-toggle ${coupon.is_active ? "active" : ""}`}
                            onClick={() =>
                              adminService
                                .updateCoupon(coupon.id, { is_active: !coupon.is_active })
                                .then(() => {
                                  toast.success(`Coupon ${coupon.is_active ? "deactivated" : "activated"}`);
                                  loadAdminData();
                                })
                                .catch((error) => toast.error(error?.response?.data?.message || "Coupon update failed"))
                            }
                          >
                            {coupon.is_active ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditCoupon(coupon)}
                            title="Edit coupon"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteCoupon(coupon.id)}
                            title="Delete coupon"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No coupons found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "catalog" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Categories</h2>
                      <p className="admin-panel-subtitle">Manage catalog categories used by storefront products.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{categories.length} categories</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetCategoryForm(); setActiveModal("category"); }}>
                        <Plus size={16} />
                        <span>Add Category</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-list">
                    {categories.length ? (
                      categories.map((category) => (
                        <article className="admin-user-row" key={category.id} style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 44px 44px" }}>
                          <div>
                            <strong>{category.name}</strong>
                            <span>
                              {category.product_count || 0} products{category.description ? ` · ${category.description}` : ""}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`admin-toggle ${category.is_active || category.is_active === undefined ? "active" : ""}`}
                            onClick={() =>
                              adminService
                                .updateCategory(category.id, { is_active: !(category.is_active || category.is_active === undefined) })
                                .then(() => {
                                  toast.success("Category updated");
                                  loadAdminData();
                                })
                                .catch((error) => toast.error(error?.response?.data?.message || "Category update failed"))
                            }
                          >
                            {category.is_active || category.is_active === undefined ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditCategory(category)}
                            title="Edit category"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteCategory(category.id)}
                            title="Delete category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No categories found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "brands" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Brands</h2>
                      <p className="admin-panel-subtitle">Manage product brands shown in the storefront filters.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{brands.length} brands</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetBrandForm(); setActiveModal("brand"); }}>
                        <Plus size={16} />
                        <span>Add Brand</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-list">
                    {brands.length ? (
                      brands.map((brand) => (
                        <article className="admin-user-row" key={brand.id} style={{ gridTemplateColumns: "52px minmax(0, 1fr) 110px 44px 44px" }}>
                          <div className="admin-avatar" style={{ borderRadius: 8 }}>
                            {brand.logo_url ? (
                              <img src={brand.logo_url} alt={brand.name} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8 }} />
                            ) : (
                              brand.name?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <strong>{brand.name}</strong>
                            <span>
                              {brand.product_count || 0} product(s){brand.website_url ? ` · ${brand.website_url}` : ""}
                            </span>
                            {brand.description && <span>{brand.description}</span>}
                          </div>
                          <button
                            type="button"
                            className={`admin-toggle ${brand.is_active || brand.is_active === undefined ? "active" : ""}`}
                            onClick={() => updateBrand(brand.id, { is_active: !(brand.is_active || brand.is_active === undefined) })}
                          >
                            {brand.is_active || brand.is_active === undefined ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditBrand(brand)}
                            title="Edit brand"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteBrand(brand.id)}
                            title="Delete brand"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No brands found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "reviews" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Product Reviews</h2>
                      <p className="admin-panel-subtitle">Approve or remove customer reviews before they appear on the storefront.</p>
                    </div>
                    <span className="admin-count-badge">{reviews.length} reviews</span>
                  </div>
                  <div className="admin-list">
                    {reviews.length ? (
                      reviews.map((review) => (
                        <article className="admin-user-row" key={review.id} style={{ gridTemplateColumns: "64px minmax(0, 1fr) 90px 44px 44px" }}>
                          <span className="admin-avatar">{review.rating}★</span>
                          <div>
                            <strong>{review.title || review.comment?.slice(0, 60) || "Review"}</strong>
                            <span>
                              {review.first_name} {review.last_name} · {review.product_title || "Product"}
                            </span>
                            <span className="admin-stars" aria-label={`${review.rating} out of 5 stars`}>
                              {"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                              {"☆".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                            </span>
                          </div>
                          <span className={`admin-status-pill ${review.is_approved ? "delivered" : "pending"}`}>
                            {review.is_approved ? "Approved" : "Pending"}
                          </span>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => toggleReview(review.id, Boolean(review.is_approved))}
                            title={review.is_approved ? "Unapprove" : "Approve"}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteReview(review.id)}
                            title="Delete review"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No reviews found</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "subscribers" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Newsletter Subscribers</h2>
                      <p className="admin-panel-subtitle">People who subscribed to the newsletter.</p>
                    </div>
                    <span className="admin-count-badge">{subscribers.length} subscribers</span>
                  </div>
                  <div className="admin-list">
                    {subscribers.length ? (
                      subscribers.map((sub) => (
                        <article className="admin-user-row" key={sub.id} style={{ gridTemplateColumns: "44px minmax(0, 1fr) 110px 44px" }}>
                          <div className="admin-avatar"><Mail size={17} /></div>
                          <div>
                            <strong>{sub.email}</strong>
                            <span>Subscribed {new Date(sub.subscribed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <span className={`admin-status-pill ${sub.is_active ? "delivered" : "cancelled"}`}>{sub.is_active ? "Active" : "Inactive"}</span>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteSubscriber(sub.id)}
                            title="Remove subscriber"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No subscribers yet</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "contacts" && (
              <section className="admin-grid">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Contact Inquiries</h2>
                      <p className="admin-panel-subtitle">Messages submitted through the contact page.</p>
                    </div>
                    <span className="admin-count-badge">{contacts.length} messages</span>
                  </div>
                  <div className="admin-list">
                    {contacts.length ? (
                      contacts.map((message) => (
                        <article className="admin-user-row" key={message.id} style={{ gridTemplateColumns: "minmax(0, 1fr) 130px 44px" }}>
                          <div>
                            <strong>{message.name} · {message.email}</strong>
                            <span>{message.subject ? `${message.subject} — ` : ""}{message.message}</span>
                            {message.phone && <span>Phone: {message.phone}</span>}
                            <span className="admin-row-meta">
                              <span className={`admin-status-pill ${message.status}`}>{message.status}</span>
                              <span className="admin-detail-muted">{new Date(message.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                            </span>
                          </div>
                          <select
                            value={message.status}
                            onChange={(e) => updateContact(message.id, e.target.value)}
                          >
                            {["pending", "read", "replied", "archived"].map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteContact(message.id)}
                            title="Delete message"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No contact messages yet</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {activeTab === "settings" && (
              <section className="admin-grid two">
                <div className="admin-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Site Settings</h2>
                      <p className="admin-panel-subtitle">Store-wide configuration used across the storefront.</p>
                    </div>
                  </div>
                  <form className="admin-form" onSubmit={submitSettings}>
                    <div className="admin-form-grid">
                      <input placeholder="Site name" value={settingsForm?.site_name || ""} onChange={(e) => updateSettingField("site_name", e.target.value)} />
                      <input placeholder="Site tagline" value={settingsForm?.site_tagline || ""} onChange={(e) => updateSettingField("site_tagline", e.target.value)} />
                      <input placeholder="Support email" value={settingsForm?.support_email || ""} onChange={(e) => updateSettingField("support_email", e.target.value)} />
                      <input placeholder="Support phone" value={settingsForm?.support_phone || ""} onChange={(e) => updateSettingField("support_phone", e.target.value)} />
                      <input placeholder="WhatsApp number" value={settingsForm?.whatsapp_number || ""} onChange={(e) => updateSettingField("whatsapp_number", e.target.value)} />
                      <input placeholder="Free shipping threshold (Rs.)" value={settingsForm?.free_shipping_threshold || ""} onChange={(e) => updateSettingField("free_shipping_threshold", e.target.value)} />
                      <input placeholder="GST rate (%)" value={settingsForm?.gst_rate || ""} onChange={(e) => updateSettingField("gst_rate", e.target.value)} />
                      <input placeholder="Smooth finish cost / gram (Rs.)" value={settingsForm?.smooth_finish_per_gram || ""} onChange={(e) => updateSettingField("smooth_finish_per_gram", e.target.value)} />
                      <input placeholder="Standard shipping cost (Rs.)" value={settingsForm?.standard_shipping_cost || ""} onChange={(e) => updateSettingField("standard_shipping_cost", e.target.value)} />
                      <input placeholder="Express shipping cost (Rs.)" value={settingsForm?.express_shipping_cost || ""} onChange={(e) => updateSettingField("express_shipping_cost", e.target.value)} />
                      <input placeholder="Same-day shipping cost (Rs.)" value={settingsForm?.same_day_shipping_cost || ""} onChange={(e) => updateSettingField("same_day_shipping_cost", e.target.value)} />
                      <input placeholder="3D print delivery window" value={settingsForm?.printing_delivery_days || ""} onChange={(e) => updateSettingField("printing_delivery_days", e.target.value)} />
                      <input placeholder="3D print delivery region" value={settingsForm?.printing_delivery_region || ""} onChange={(e) => updateSettingField("printing_delivery_region", e.target.value)} />
                    </div>
                    <textarea placeholder="Company address" value={settingsForm?.company_address || ""} onChange={(e) => updateSettingField("company_address", e.target.value)} />
                    <textarea placeholder="Business hours" value={settingsForm?.business_hours || ""} onChange={(e) => updateSettingField("business_hours", e.target.value)} />
                    <button className="admin-primary" type="submit" disabled={settingsSaving}>
                      <Save size={16} />
                      <span>{settingsSaving ? "Saving..." : "Save Settings"}</span>
                    </button>
                  </form>
                </div>

                <div className="admin-panel admin-section-panel">
                  <div className="admin-panel-title-row">
                    <div>
                      <h2>Home Hero Banners</h2>
                      <p className="admin-panel-subtitle">Slides shown at the top of the home page.</p>
                    </div>
                    <div className="admin-actions compact">
                      <span className="admin-count-badge">{banners.length} banners</span>
                      <button type="button" className="admin-primary" onClick={() => { setEditing(null); resetBannerForm(); setActiveModal("banner"); }}>
                        <Plus size={16} />
                        <span>Add Banner</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-list">
                    {banners.length ? (
                      banners.map((banner) => (
                        <article className="admin-user-row" key={banner.id} style={{ gridTemplateColumns: "52px minmax(0, 1fr) 110px 44px 44px" }}>
                          <div className="admin-avatar" style={{ borderRadius: 8 }}>
                            {banner.image_url && <img src={banner.image_url} alt={banner.title || "Banner"} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />}
                          </div>
                          <div>
                            <strong>{banner.title || "Untitled banner"}</strong>
                            <span>{banner.subtitle || "No subtitle"} · {banner.sort_order || 0}</span>
                            {banner.link_url && <span><Link2 size={11} /> {banner.link_url}</span>}
                          </div>
                          <button
                            type="button"
                            className={`admin-toggle ${banner.is_active || banner.is_active === undefined ? "active" : ""}`}
                            onClick={() => updateBanner(banner.id, { is_active: !(banner.is_active || banner.is_active === undefined) })}
                          >
                            {banner.is_active || banner.is_active === undefined ? "Active" : "Inactive"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon"
                            onClick={() => openEditBanner(banner)}
                            title="Edit banner"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => deleteBanner(banner.id)}
                            title="Delete banner"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <div className="admin-empty small">No banners yet — add one to power the home hero slider.</div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <AdminModal
        open={activeModal === "product"}
        title={editing?.id ? "Edit Product" : "Add Product"}
        subtitle={editing?.id ? "Update the product details shown on the storefront page." : "Create a product with all details customers will see on its page."}
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitProduct}>
          <h4 className="admin-form-section-title">Basic Information</h4>
          <div className="admin-form-grid">
            <input required placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
            <input placeholder="SKU" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
          </div>
          <input placeholder="Tagline / subtitle (shown under the product title)" value={productForm.tagline} onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })} />
          <select required value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select value={productForm.brand_id} onChange={(e) => setProductForm({ ...productForm, brand_id: e.target.value })}>
            <option value="">Select brand (optional)</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <div className="admin-form-grid">
            <input required type="number" step="0.01" placeholder="Price (Rs.)" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
            <input type="number" step="0.01" placeholder="Compare price (was Rs.)" value={productForm.compare_price} onChange={(e) => setProductForm({ ...productForm, compare_price: e.target.value })} />
            <input type="number" placeholder="Stock quantity" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
          </div>
          <textarea maxLength={500} placeholder="Short description (one-liner used on product cards)" value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} />

          <h4 className="admin-form-section-title">Product Description &amp; Features</h4>
          <textarea rows={4} placeholder="Full product description shown on the Overview tab" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
          <textarea
            rows={4}
            placeholder="Key features - one per line (shown on Overview tab)"
            value={productForm.keyFeaturesText}
            onChange={(e) => setProductForm({ ...productForm, keyFeaturesText: e.target.value })}
          />
          <textarea
            rows={3}
            placeholder="Applications - one per line (e.g. IoT Projects)"
            value={productForm.applicationsText}
            onChange={(e) => setProductForm({ ...productForm, applicationsText: e.target.value })}
          />

          <h4 className="admin-form-section-title">Specifications</h4>
          <textarea
            rows={5}
            placeholder="One per line as  Name : Value  (shown on Specifications tab)"
            value={productForm.specificationsText}
            onChange={(e) => setProductForm({ ...productForm, specificationsText: e.target.value })}
          />
          <h4 className="admin-form-section-title">Pinout</h4>
          {editing?.id && !productForm.pinoutImageFile && (
            <p className="admin-form-hint">Pick a file only if you want to replace the existing pinout diagram.</p>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProductForm({ ...productForm, pinoutImageFile: e.target.files?.[0] })}
            aria-label="Pinout image"
          />
          <textarea
            rows={3}
            placeholder="Pinout description (explains the diagram shown on the Pinout tab)"
            value={productForm.pinout_description}
            onChange={(e) => setProductForm({ ...productForm, pinout_description: e.target.value })}
          />

          <h4 className="admin-form-section-title">Resources (Datasheets &amp; Downloads)</h4>
          <textarea
            rows={4}
            placeholder="One per line as  Name | Type | URL  (types: pdf, github, link, image, file)"
            value={productForm.resourcesText}
            onChange={(e) => setProductForm({ ...productForm, resourcesText: e.target.value })}
          />
          <p className="admin-form-hint">Example: Datasheet | pdf | https://www.ti.com/lit/ds/symlink/lm35.pdf</p>

          <h4 className="admin-form-section-title">FAQs</h4>
          <textarea
            rows={3}
            placeholder="One per line as  Question | Answer"
            value={productForm.faqsText}
            onChange={(e) => setProductForm({ ...productForm, faqsText: e.target.value })}
          />
          <p className="admin-form-hint">Example: What is the operating voltage? | 2.5V to 5.5V</p>

          <h4 className="admin-form-section-title">Gallery Images</h4>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setProductForm({ ...productForm, galleryFiles: Array.from(e.target.files || []) })}
            aria-label="Gallery images"
          />
          <p className="admin-form-hint">
            {productForm.galleryFiles.length > 0
              ? `${productForm.galleryFiles.length} new image(s) selected`
              : "Add up to 5 gallery images (appended when editing)"}
          </p>

          <label className="admin-check">
            <input type="checkbox" checked={productForm.is_featured} onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })} />
            Featured product
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })} />
            Active (visible on storefront)
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Product" : "Create Product"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "material"}
        title={editing?.id ? "Edit Material" : "Add Material"}
        subtitle="Manage a printable material and its price per gram."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitMaterial}>
          <div className="admin-form-grid">
            <input required placeholder="Material name" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} />
            <input placeholder="Code, e.g. PLA" value={materialForm.code} onChange={(e) => setMaterialForm({ ...materialForm, code: e.target.value })} />
            <input required type="number" step="0.01" placeholder="Price per gram" value={materialForm.price_per_gram} onChange={(e) => setMaterialForm({ ...materialForm, price_per_gram: e.target.value })} />
            <input type="number" step="0.01" placeholder="Density g/cm3" value={materialForm.density_g_cm3} onChange={(e) => setMaterialForm({ ...materialForm, density_g_cm3: e.target.value })} />
          </div>
          <textarea placeholder="Best use or description" value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} />
          <label className="admin-check">
            <input type="checkbox" checked={materialForm.is_active} onChange={(e) => setMaterialForm({ ...materialForm, is_active: e.target.checked })} />
            Available for customers
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Material" : "Create Material"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "color"}
        title={editing?.id ? "Edit Color" : "Add Color"}
        subtitle="Manage a selectable color for custom 3D print requests."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitColor}>
          <div className="admin-color-form-row">
            <input required placeholder="Color name" value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} />
            <input type="color" value={colorForm.hex_code} onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })} aria-label="Color value" />
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={colorForm.is_active} onChange={(e) => setColorForm({ ...colorForm, is_active: e.target.checked })} />
            Available for customers
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Color" : "Create Color"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "coupon"}
        title={editing?.id ? "Edit Coupon" : "Add Coupon"}
        subtitle="Manage a discount code for checkout."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitCoupon}>
          <input required placeholder="Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
          <select value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
          <div className="admin-form-grid">
            <input required type="number" placeholder="Discount value" value={couponForm.discount_value} onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })} />
            <input type="number" placeholder="Minimum order" value={couponForm.min_order_amount} onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })} />
            <input type="number" placeholder="Max discount (for % codes)" value={couponForm.max_discount} onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })} />
            <input type="number" placeholder="Usage limit" value={couponForm.usage_limit} onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })} />
          </div>
          <div className="admin-form-grid">
            <input type="date" placeholder="Valid from" value={couponForm.valid_from} onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })} />
            <input type="date" placeholder="Valid until" value={couponForm.valid_until} onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })} />
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={couponForm.is_active} onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })} />
            Active coupon
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Coupon" : "Create Coupon"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "category"}
        title={editing?.id ? "Edit Category" : "Add Category"}
        subtitle="Manage a storefront catalog category."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitCategory}>
          <input required placeholder="Name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          <textarea placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
          <label className="admin-check">
            <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
            Active category
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Category" : "Create Category"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "user"}
        title="Edit User"
        subtitle="Update customer/administrator account details."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitUser}>
          <div className="admin-form-grid">
            <input required placeholder="First name" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} />
            <input required placeholder="Last name" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} />
            <input required type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            <input placeholder="Phone" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
          </div>
          <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          <label className="admin-check">
            <input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })} />
            Active account
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>Save User</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "brand"}
        title={editing?.id ? "Edit Brand" : "Add Brand"}
        subtitle="Brands appear in the storefront filter sidebar with their logo."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitBrand}>
          <input required placeholder="Brand name" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
          <textarea placeholder="Short description" value={brandForm.description} onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })} />
          <input placeholder="Website URL (optional)" value={brandForm.website_url} onChange={(e) => setBrandForm({ ...brandForm, website_url: e.target.value })} />
          <label className="admin-file-row">
            <span>Brand logo</span>
            <input type="file" accept="image/*" onChange={(e) => setBrandForm({ ...brandForm, logoFile: e.target.files?.[0] || null })} />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={brandForm.is_active} onChange={(e) => setBrandForm({ ...brandForm, is_active: e.target.checked })} />
            Active brand
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Brand" : "Create Brand"}</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "banner"}
        title={editing?.id ? "Edit Banner" : "Add Hero Banner"}
        subtitle="Banners power the home page hero slider."
        onClose={closeModal}
      >
        <form className="admin-form" onSubmit={submitBanner}>
          <div className="admin-form-grid">
            <input required placeholder="Title" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} />
            <input type="number" placeholder="Sort order (lower = first)" value={bannerForm.sort_order} onChange={(e) => setBannerForm({ ...bannerForm, sort_order: e.target.value })} />
            <input placeholder="Subtitle" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} />
            <input placeholder="Button text (default Shop Now)" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} />
          </div>
          <input placeholder="Link URL (e.g. /products or /printing)" value={bannerForm.link_url} onChange={(e) => setBannerForm({ ...bannerForm, link_url: e.target.value })} />
          {editing?.id && !bannerForm.imageFile ? (
            <small className="admin-hint">Current image is kept — pick a new file only to replace it.</small>
          ) : null}
          <label className="admin-file-row">
            <span>Image</span>
            <input type="file" accept="image/*" onChange={(e) => setBannerForm({ ...bannerForm, imageFile: e.target.files?.[0] || null })} />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={bannerForm.is_active} onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })} />
            Active banner
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>{editing?.id ? "Update Banner" : "Create Banner"}</span>
          </button>
        </form>
      </AdminModal>
    </div>
  );
}

function AdminModal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-modal-header">
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function AdminSalesChart({ monthlySales = [] }) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const byMonth = {};
  monthlySales.forEach((row) => {
    byMonth[Number(row.month)] = Number(row.total_sales || 0);
  });
  const series = MONTHS.map((label, idx) => ({ label, value: byMonth[idx + 1] || 0 }));
  const max = Math.max(...series.map((s) => s.value), 1);

  return (
    <div className="admin-chart">
      <div className="admin-chart-bars">
        {series.map((point) => (
          <div className="admin-chart-col" key={point.label} title={`${point.label}: Rs. ${point.value.toLocaleString("en-IN")}`}>
            <div className="admin-chart-bar-wrap">
              <div
                className={`admin-chart-bar ${point.value > 0 ? "" : "empty"}`}
                style={{ height: `${Math.max(point.value > 0 ? 6 : 2, (point.value / max) * 100)}%` }}
              />
            </div>
            <span>{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTable({ columns, rows, emptyMessage = "No records yet" }) {
  return (
    <div className="admin-table">
      <div className="admin-table-head" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      {rows.length ? rows.map((row, index) => (
        <div className="admin-table-row" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }} key={index}>
          {row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}
        </div>
      )) : <div className="admin-empty small">{emptyMessage}</div>}
    </div>
  );
}

/* ============================================================ */
/* ADMIN ORDER DETAIL VIEW (Regular product orders)             */
/* ============================================================ */
function AdminOrderDetail({ order, loading, onBack, onStatusUpdate, onTrackingUpdate, statusOptions, money }) {
  const [trackingForm, setTrackingForm] = useState({});
  const [trackingSaved, setTrackingSaved] = useState(false);

  useEffect(() => {
    if (order?.id) {
      setTrackingForm({
        tracking_number: order.tracking_number || "",
        shipping_carrier: order.shipping_carrier || "",
        notes: order.notes || "",
      });
      setTrackingSaved(false);
    }
  }, [order?.id]);

  const saveTracking = () => {
    onTrackingUpdate(order.id, {
      tracking_number: trackingForm.tracking_number?.trim() || null,
      shipping_carrier: trackingForm.shipping_carrier?.trim() || null,
      notes: trackingForm.notes?.trim() || null,
    });
    setTrackingSaved(true);
  };

  if (loading) return <div className="admin-empty">Loading order details…</div>;
  if (!order) return null;

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const statusIcon = (status) => {
    switch (status) {
      case "delivered": return <CheckCircle2 size={16} />;
      case "shipped": return <Truck size={16} />;
      case "cancelled": return <XCircle size={16} />;
      case "pending": return <Clock size={16} />;
      default: return <Package size={16} />;
    }
  };

  return (
    <section className="admin-detail-view">
      <button type="button" className="admin-detail-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Back to Orders</span>
      </button>

      <div className="admin-detail-header">
        <div className="admin-detail-header-left">
          <h2>Order #{order.order_number}</h2>
          <span className="admin-detail-date">{formatDate(order.created_at)}</span>
        </div>
        <span className={`admin-detail-status-badge ${order.status}`}>
          {statusIcon(order.status)}
          <span>{order.status}</span>
        </span>
      </div>

      <div className="admin-detail-grid">
        {/* Customer Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <User size={18} />
            <h3>Customer Info</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">Name</span>
              <span className="admin-detail-value">{order.first_name} {order.last_name}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Email</span>
              <span className="admin-detail-value">{order.email}</span>
            </div>
            {order.user_phone && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Phone</span>
                <span className="admin-detail-value">{order.user_phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <MapPin size={18} />
            <h3>Shipping Address</h3>
          </div>
          <div className="admin-detail-card-body">
            <p className="admin-detail-address">
              {order.shipping_name && <strong>{order.shipping_name}<br /></strong>}
              {order.shipping_address1}{order.shipping_address2 && `, ${order.shipping_address2}`}<br />
              {order.shipping_city}, {order.shipping_state} {order.shipping_pincode}<br />
              {order.shipping_phone && <>{order.shipping_phone}</>}
            </p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <CreditCard size={18} />
            <h3>Payment</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">Method</span>
              <span className="admin-detail-value">{order.payment_method_label || order.payment_method || "—"}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Payment Status</span>
              <span className={`admin-detail-payment-badge ${order.payment_status}`}>{order.payment_status}</span>
            </div>
            {order.tracking_number && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Tracking</span>
                <span className="admin-detail-value">{order.shipping_carrier} — {order.tracking_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Update */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <Package size={18} />
            <h3>Update Status</h3>
          </div>
          <div className="admin-detail-card-body">
            <select
              className="admin-detail-status-select"
              value={order.status}
              onChange={(e) => onStatusUpdate(order.id, e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tracking & Notes */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <Truck size={18} />
            <h3>Tracking & Notes</h3>
          </div>
          <div className="admin-detail-card-body admin-tracking-form">
            <input
              placeholder="Tracking number"
              value={trackingForm.tracking_number || ""}
              onChange={(e) => setTrackingForm((prev) => ({ ...prev, tracking_number: e.target.value }))}
            />
            <input
              placeholder="Shipping carrier (e.g. Delhivery, Blue Dart)"
              value={trackingForm.shipping_carrier || ""}
              onChange={(e) => setTrackingForm((prev) => ({ ...prev, shipping_carrier: e.target.value }))}
            />
            <textarea
              placeholder="Admin notes (internal)"
              rows={3}
              value={trackingForm.notes || ""}
              onChange={(e) => setTrackingForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <button type="button" className="admin-primary small" onClick={saveTracking}>
              <Save size={15} />
              <span>{trackingSaved ? "Saved" : "Save Tracking"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Order Items */}
      {order.items && order.items.length > 0 && (
        <div className="admin-detail-card admin-detail-items-card">
          <div className="admin-detail-card-head">
            <Box size={18} />
            <h3>Order Items ({order.items.length})</h3>
          </div>
          <div className="admin-detail-items-table">
            <div className="admin-detail-items-header">
              <span>Product</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            {order.items.map((item, idx) => (
              <div className="admin-detail-items-row" key={item.id || idx}>
                <div className="admin-detail-item-product">
                  {item.image_url && <img src={item.image_url} alt={item.product_name} />}
                  <div>
                    <strong>{item.product_name}</strong>
                    <span>{item.category_name || item.variant_value || ""}</span>
                  </div>
                </div>
                <span>{money(item.price)}</span>
                <span>{item.quantity}</span>
                <strong>{money(item.total)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Totals */}
      <div className="admin-detail-card admin-detail-summary-card">
        <div className="admin-detail-card-head">
          <FileText size={18} />
          <h3>Order Summary</h3>
        </div>
        <div className="admin-detail-summary-rows">
          <div className="admin-detail-summary-row">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="admin-detail-summary-row">
            <span>Shipping</span>
            <span>{money(order.shipping_cost)}</span>
          </div>
          {order.discount > 0 && (
            <div className="admin-detail-summary-row">
              <span>Discount</span>
              <span className="admin-detail-discount">-{money(order.discount)}</span>
            </div>
          )}
          <div className="admin-detail-summary-row">
            <span>Tax</span>
            <span>{money(order.tax_amount)}</span>
          </div>
          <div className="admin-detail-summary-row admin-detail-total-row">
            <strong>Total Amount</strong>
            <strong>{money(order.total_amount)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* ADMIN 3D PRINT ORDER DETAIL VIEW                             */
/* ============================================================ */
function AdminPrintOrderDetail({ order, loading, onBack, onStatusUpdate, onNotesUpdate, statusOptions, money }) {
  const [notesForm, setNotesForm] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (order?.id) {
      setNotesForm(order.admin_notes || "");
      setNotesSaved(false);
    }
  }, [order?.id]);

  const saveNotes = () => {
    onNotesUpdate(order.id, notesForm);
    setNotesSaved(true);
  };
  if (loading) return <div className="admin-empty">Loading order details…</div>;
  if (!order) return null;

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  const statusIcon = (status) => {
    switch (status) {
      case "delivered": return <CheckCircle2 size={16} />;
      case "shipped": return <Truck size={16} />;
      case "cancelled": return <XCircle size={16} />;
      case "pending": return <Clock size={16} />;
      case "printing": case "in_production": return <Cuboid size={16} />;
      default: return <Package size={16} />;
    }
  };

  const dimensions = [order.dimension_x, order.dimension_y, order.dimension_z].filter(Boolean);

  return (
    <section className="admin-detail-view">
      <button type="button" className="admin-detail-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Back to 3D Print Orders</span>
      </button>

      <div className="admin-detail-header">
        <div className="admin-detail-header-left">
          <h2>3D Print Order #{order.order_number}</h2>
          <span className="admin-detail-date">{formatDate(order.created_at)}</span>
        </div>
        <span className={`admin-detail-status-badge ${order.status}`}>
          {statusIcon(order.status)}
          <span>{order.status?.replace(/_/g, " ")}</span>
        </span>
      </div>

      <div className="admin-detail-grid">
        {/* Customer Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <User size={18} />
            <h3>Customer Info</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">Name</span>
              <span className="admin-detail-value">{order.first_name} {order.last_name}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Email</span>
              <span className="admin-detail-value">{order.email}</span>
            </div>
            {order.user_phone && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Phone</span>
                <span className="admin-detail-value">{order.user_phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Print File Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <Download size={18} />
            <h3>3D Model File</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">File Name</span>
              <span className="admin-detail-value">{order.file_name}</span>
            </div>
            {order.file_size && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">File Size</span>
                <span className="admin-detail-value">{order.file_size} MB</span>
              </div>
            )}
            {order.file_url && (
              <a href={order.file_url} target="_blank" rel="noopener noreferrer" className="admin-detail-file-link">
                <Download size={14} />
                <span>Download File</span>
              </a>
            )}
          </div>
        </div>

        {/* Print Specifications */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <Cuboid size={18} />
            <h3>Print Specifications</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">Material</span>
              <span className="admin-detail-value">{order.material_name || "—"}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Color</span>
              <span className="admin-detail-value admin-detail-color-value">
                {order.color_hex && <span className="admin-detail-color-dot" style={{ backgroundColor: order.color_hex }} />}
                {order.color_name || order.custom_color_hex || "—"}
              </span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Infill Density</span>
              <span className="admin-detail-value">{order.infill_density || 50}%</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Surface Finish</span>
              <span className="admin-detail-value" style={{ textTransform: "capitalize" }}>{order.surface_finish || "standard"}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Quantity</span>
              <span className="admin-detail-value">{order.quantity}</span>
            </div>
            {dimensions.length > 0 && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Dimensions (mm)</span>
                <span className="admin-detail-value">{dimensions.join(" × ")}</span>
              </div>
            )}
            {order.estimated_weight && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Estimated Weight</span>
                <span className="admin-detail-value">{order.estimated_weight}g</span>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <MapPin size={18} />
            <h3>Shipping Address</h3>
          </div>
          <div className="admin-detail-card-body">
            {order.shipping_name ? (
              <p className="admin-detail-address">
                <strong>{order.shipping_name}</strong><br />
                {order.shipping_address1}<br />
                {order.shipping_city}, {order.shipping_state} {order.shipping_pincode}<br />
                {order.shipping_phone && <>{order.shipping_phone}</>}
              </p>
            ) : (
              <span className="admin-detail-muted">No shipping address provided</span>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <CreditCard size={18} />
            <h3>Payment</h3>
          </div>
          <div className="admin-detail-card-body">
            <div className="admin-detail-field">
              <span className="admin-detail-label">Method</span>
              <span className="admin-detail-value" style={{ textTransform: "uppercase" }}>{order.payment_method || "—"}</span>
            </div>
            <div className="admin-detail-field">
              <span className="admin-detail-label">Payment Status</span>
              <span className={`admin-detail-payment-badge ${order.payment_status}`}>{order.payment_status}</span>
            </div>
          </div>
        </div>

        {/* Status Update */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <Package size={18} />
            <h3>Update Status</h3>
          </div>
          <div className="admin-detail-card-body">
            <select
              className="admin-detail-status-select"
              value={order.status}
              onChange={(e) => onStatusUpdate(order.id, e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Notes */}
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <FileText size={18} />
            <h3>Admin Notes</h3>
          </div>
          <div className="admin-detail-card-body admin-tracking-form">
            <textarea
              placeholder="Internal notes about this print job"
              rows={3}
              value={notesForm}
              onChange={(e) => setNotesForm(e.target.value)}
            />
            {order.admin_notes && (
              <div className="admin-detail-field">
                <span className="admin-detail-label">Current</span>
                <span className="admin-detail-value" style={{ textAlign: "left", fontWeight: 600 }}>{order.admin_notes}</span>
              </div>
            )}
            <button type="button" className="admin-primary small" onClick={saveNotes}>
              <Save size={15} />
              <span>{notesSaved ? "Saved" : "Save Notes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="admin-detail-card admin-detail-summary-card">
        <div className="admin-detail-card-head">
          <FileText size={18} />
          <h3>Pricing Breakdown</h3>
        </div>
        <div className="admin-detail-summary-rows">
          <div className="admin-detail-summary-row">
            <span>Material Cost</span>
            <span>{money(order.material_cost)}</span>
          </div>
          {order.color_cost > 0 && (
            <div className="admin-detail-summary-row">
              <span>Color Cost</span>
              <span>{money(order.color_cost)}</span>
            </div>
          )}
          {order.finish_cost > 0 && (
            <div className="admin-detail-summary-row">
              <span>Finish Cost</span>
              <span>{money(order.finish_cost)}</span>
            </div>
          )}
          <div className="admin-detail-summary-row">
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className="admin-detail-summary-row">
            <span>Tax (GST)</span>
            <span>{money(order.tax_amount)}</span>
          </div>
          <div className="admin-detail-summary-row admin-detail-total-row">
            <strong>Total Amount</strong>
            <strong>{money(order.total_amount)}</strong>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      {order.admin_notes && (
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <FileText size={18} />
            <h3>Admin Notes</h3>
          </div>
          <div className="admin-detail-card-body">
            <p className="admin-detail-notes">{order.admin_notes}</p>
          </div>
        </div>
      )}

      {order.notes && (
        <div className="admin-detail-card">
          <div className="admin-detail-card-head">
            <FileText size={18} />
            <h3>Customer Notes</h3>
          </div>
          <div className="admin-detail-card-body">
            <p className="admin-detail-notes">{order.notes}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPanel;
