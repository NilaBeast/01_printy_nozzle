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
  Tag,
  Trash2,
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

function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [printSubTab, setPrintSubTab] = useState("orders");
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
  const [activeModal, setActiveModal] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [selectedPrintOrderDetail, setSelectedPrintOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "",
    category_id: "",
    short_description: "",
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

  const createProduct = async (event) => {
    event.preventDefault();
    try {
      await adminService.createProduct({
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      });
      toast.success("Product created");
      setActiveModal(null);
      setProductForm({
        name: "",
        sku: "",
        price: "",
        stock: "",
        category_id: "",
        short_description: "",
        is_featured: false,
        is_active: true,
      });
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Product create failed");
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

  const createCoupon = async (event) => {
    event.preventDefault();
    try {
      await adminService.createCoupon(couponForm);
      toast.success("Coupon created");
      setActiveModal(null);
      setCouponForm({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        min_order_amount: 0,
        max_discount: "",
        usage_limit: "",
        is_active: true,
      });
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Coupon create failed");
    }
  };

  const createCategory = async (event) => {
    event.preventDefault();
    try {
      await adminService.createCategory(categoryForm);
      toast.success("Category created");
      setActiveModal(null);
      setCategoryForm({ name: "", description: "", is_active: true });
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Category create failed");
    }
  };

  const createMaterial = async (event) => {
    event.preventDefault();
    try {
      await adminService.createMaterial({
        ...materialForm,
        code: materialForm.code || materialForm.name.slice(0, 4),
        price_per_gram: Number(materialForm.price_per_gram),
        density_g_cm3: Number(materialForm.density_g_cm3 || 1.24),
      });
      toast.success("Material created");
      setActiveModal(null);
      setMaterialForm({
        name: "",
        code: "",
        description: "",
        price_per_gram: "",
        density_g_cm3: "1.24",
        is_active: true,
      });
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Material create failed");
    }
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

  const createColor = async (event) => {
    event.preventDefault();
    try {
      await adminService.createColor(colorForm);
      toast.success("Color created");
      setActiveModal(null);
      setColorForm({ name: "", hex_code: "#0b6bdc", is_active: true });
      loadAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Color create failed");
    }
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

  const updateOrder = async (id, status) => {
    try {
      await adminService.updateOrderStatus(id, { status });
      toast.success("Order status updated");
      loadAdminData();
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
  ];

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
          <span>Admin</span>
        </Link>
        <nav className="admin-tabs">
          {tabs.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className={`admin-tab ${activeTab === id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(id);
                setSelectedOrderDetail(null);
                setSelectedPrintOrderDetail(null);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">PrintyNozzle Control Room</span>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
          </div>
          <button type="button" className="admin-refresh" onClick={loadAdminData}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </header>

        {loading ? (
          <div className="admin-empty">Loading admin data...</div>
        ) : (
          <>
            {activeTab === "dashboard" && (
              <>
                <section className="admin-stat-grid">
                  {[
                    ["Revenue", money(stats.totalRevenue), BarChart3],
                    ["Orders", stats.totalOrders || 0, ClipboardList],
                    ["3D Print Orders", stats.totalPrintOrders || 0, Cuboid],
                    ["Customers", stats.totalUsers || 0, Users],
                    ["Products", stats.totalProducts || 0, Box],
                    ["Low Stock", stats.lowStockCount || 0, ShieldCheck],
                  ].map(([label, value, Icon]) => (
                    <article className="admin-stat" key={label}>
                      <Icon size={21} />
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </article>
                  ))}
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
                      <button type="button" className="admin-primary" onClick={() => setActiveModal("product")}>
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
                      filteredProducts.map((product) => (
                        <article className="admin-product-row" key={product.id}>
                          <img src={product.primary_image || "/images/products/01.png"} alt={product.name} />
                          <div className="admin-product-info">
                            <strong>{product.name}</strong>
                            <span>{product.sku || product.brand_name || "No SKU"}</span>
                          </div>
                          <span className="admin-muted-cell">{product.category_name || product.brand_name || "Catalog"}</span>
                          <input
                            type="number"
                            defaultValue={product.price}
                            onBlur={(e) => updateProduct(product.id, { price: Number(e.target.value) })}
                            aria-label="Price"
                          />
                          <input
                            type="number"
                            defaultValue={product.stock}
                            onBlur={(e) => updateProduct(product.id, { stock: Number(e.target.value) })}
                            aria-label="Stock"
                          />
                          <button
                            type="button"
                            className="admin-icon danger"
                            onClick={() => updateProduct(product.id, { is_active: false })}
                            title="Deactivate product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
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
                    <span className="admin-count-badge">{orders.length} orders</span>
                  </div>
                  <div className="admin-list">
                    {orders.length ? (
                      orders.map((order) => (
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
                      ))
                    ) : (
                      <div className="admin-empty small">No customer orders yet</div>
                    )}
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
                    <span className="admin-count-badge">{printOrders.length} orders</span>
                  </div>
                  <div className="admin-list">
                    {printOrders.length ? printOrders.map((order) => (
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
                    )) : <div className="admin-empty small">No 3D print orders yet</div>}
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
                      <button type="button" className="admin-primary" onClick={() => setActiveModal("material")}>
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
                      <button type="button" className="admin-primary" onClick={() => setActiveModal("color")}>
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
                        <article className="admin-user-row" key={user.id}>
                          <div className="admin-avatar">{`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`}</div>
                          <div>
                            <strong>{user.first_name} {user.last_name}</strong>
                            <span>{user.email}</span>
                          </div>
                          <span className="admin-pill">{user.role}</span>
                          <button
                            type="button"
                            className="admin-secondary"
                            onClick={() => adminService.updateUser(user.id, { is_active: !user.is_active }).then(loadAdminData)}
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
                      <button type="button" className="admin-primary" onClick={() => setActiveModal("coupon")}>
                        <Plus size={16} />
                        <span>Add Coupon</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-chip-list">
                    {coupons.length ? (
                      coupons.map((coupon) => (
                        <span className="admin-chip" key={coupon.id}>
                          {coupon.code} | {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : money(coupon.discount_value)}
                        </span>
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
                      <button type="button" className="admin-primary" onClick={() => setActiveModal("category")}>
                        <Plus size={16} />
                        <span>Add Category</span>
                      </button>
                    </div>
                  </div>
                  <div className="admin-chip-list">
                    {categories.length ? (
                      categories.map((category) => (
                        <span className="admin-chip" key={category.id}>
                          {category.name} | {category.product_count || 0}
                        </span>
                      ))
                    ) : (
                      <div className="admin-empty small">No categories found</div>
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
        title="Add Product"
        subtitle="Create a backend product that can be managed from admin."
        onClose={() => setActiveModal(null)}
      >
        <form className="admin-form" onSubmit={createProduct}>
          <input required placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
          <input placeholder="SKU" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} />
          <select required value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="admin-form-grid">
            <input required type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} />
            <input type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} />
          </div>
          <textarea placeholder="Short description" value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} />
          <label className="admin-check">
            <input type="checkbox" checked={productForm.is_featured} onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })} />
            Featured product
          </label>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>Create Product</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "material"}
        title="Add Material"
        subtitle="Create a printable material and define its price per gram."
        onClose={() => setActiveModal(null)}
      >
        <form className="admin-form" onSubmit={createMaterial}>
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
            <span>Create Material</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "color"}
        title="Add Color"
        subtitle="Add a selectable color for custom 3D print requests."
        onClose={() => setActiveModal(null)}
      >
        <form className="admin-form" onSubmit={createColor}>
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
            <span>Create Color</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "coupon"}
        title="Add Coupon"
        subtitle="Create a discount code for checkout."
        onClose={() => setActiveModal(null)}
      >
        <form className="admin-form" onSubmit={createCoupon}>
          <input required placeholder="Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
          <select value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
          <div className="admin-form-grid">
            <input required type="number" placeholder="Discount value" value={couponForm.discount_value} onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })} />
            <input type="number" placeholder="Minimum order" value={couponForm.min_order_amount} onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })} />
          </div>
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>Create Coupon</span>
          </button>
        </form>
      </AdminModal>

      <AdminModal
        open={activeModal === "category"}
        title="Add Category"
        subtitle="Create a storefront catalog category."
        onClose={() => setActiveModal(null)}
      >
        <form className="admin-form" onSubmit={createCategory}>
          <input required placeholder="Name" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
          <textarea placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} />
          <button className="admin-primary" type="submit">
            <Save size={16} />
            <span>Create Category</span>
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
function AdminOrderDetail({ order, loading, onBack, onStatusUpdate, statusOptions, money }) {
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
function AdminPrintOrderDetail({ order, loading, onBack, onStatusUpdate, statusOptions, money }) {
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
