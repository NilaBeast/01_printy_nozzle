const db = require("../../config/db");

/* Manual (offline) invoices also feed the dashboard: product rows count as
 * orders, print rows as 3D-print orders, PAID invoices as revenue, and
 * distinct bill-to profiles as customers. Every manual query is isolated in
 * try/catch so older DBs without the manual tables still load the dashboard. */
const manualStats = async () => {
  const empty = {
    revenue: 0,
    orders: 0,
    printOrders: 0,
    customers: 0,
    monthly: [],
    status: [],
    recent: [],
    productUnits: {},
  };
  try {
    const [[rev]] = await db.query(
      "SELECT COALESCE(SUM(grand_total), 0) AS revenue FROM manual_invoices WHERE UPPER(payment_status) = 'PAID'"
    );
    empty.revenue = Number(rev?.revenue || 0);

    const [[ord]] = await db.query(
      `SELECT COUNT(DISTINCT m.id) AS orders FROM manual_invoices m
       JOIN manual_invoice_items i ON i.invoice_id = m.id AND i.item_type <> 'print'`
    );
    empty.orders = Number(ord?.orders || 0);

    const [[prn]] = await db.query(
      `SELECT COUNT(DISTINCT m.id) AS print_orders FROM manual_invoices m
       JOIN manual_invoice_items i ON i.invoice_id = m.id AND i.item_type = 'print'`
    );
    empty.printOrders = Number(prn?.print_orders || 0);

    const [[cus]] = await db.query(
      `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(customer_phone), ''), TRIM(customer_name))) AS customers
       FROM manual_invoices`
    );
    empty.customers = Number(cus?.customers || 0);

    const [monthly] = await db.query(
      `SELECT MONTH(invoice_date) AS month, MONTHNAME(invoice_date) AS month_name,
              COALESCE(SUM(grand_total), 0) AS total_sales, COUNT(*) AS order_count
       FROM manual_invoices
       WHERE invoice_date IS NOT NULL AND YEAR(invoice_date) = YEAR(CURDATE())
         AND UPPER(payment_status) = 'PAID'
       GROUP BY MONTH(invoice_date), MONTHNAME(invoice_date)`
    );
    empty.monthly = monthly || [];

    const [status] = await db.query(
      `SELECT CASE
         WHEN UPPER(payment_status) = 'PAID' THEN 'delivered'
         WHEN UPPER(payment_status) = 'PENDING' THEN 'pending'
         WHEN UPPER(payment_status) IN ('FAILED', 'CANCELLED') THEN 'cancelled'
         ELSE 'processing'
       END AS status, COUNT(*) AS count
       FROM manual_invoices GROUP BY status`
    );
    empty.status = status || [];

    const [recent] = await db.query(
      `SELECT CONCAT('manual-', m.id) AS id, m.invoice_number AS order_number,
              m.customer_name AS first_name, '' AS last_name,
              COALESCE(NULLIF(m.customer_email, ''), m.customer_phone) AS email,
              CASE
                WHEN UPPER(m.payment_status) = 'PAID' THEN 'delivered'
                WHEN UPPER(m.payment_status) = 'PENDING' THEN 'pending'
                WHEN UPPER(m.payment_status) IN ('FAILED', 'CANCELLED') THEN 'cancelled'
                ELSE 'processing'
              END AS status, m.payment_status, m.payment_method,
              m.grand_total AS total_amount, m.created_at
       FROM manual_invoices m ORDER BY m.created_at DESC LIMIT 5`
    );
    empty.recent = recent || [];

    const [units] = await db.query(
      `SELECT product_id, COALESCE(SUM(qty), 0) AS manual_sold
       FROM manual_invoice_items WHERE product_id IS NOT NULL GROUP BY product_id`
    );
    (units || []).forEach((u) => {
      empty.productUnits[u.product_id] = Number(u.manual_sold || 0);
    });
  } catch (e) {
    /* manual tables missing — dashboard continues with store orders only */
  }
  return empty;
};

/* Merge two [{month, month_name, total_sales, order_count}] lists by month. */
const mergeMonthly = (a = [], b = []) => {
  const map = {};
  [...a, ...b].forEach((r) => {
    const m = Number(r.month);
    if (!map[m]) map[m] = { month: m, month_name: r.month_name, total_sales: 0, order_count: 0 };
    map[m].total_sales = Number(map[m].total_sales) + Number(r.total_sales || 0);
    map[m].order_count = Number(map[m].order_count || 0) + Number(r.order_count || 0);
  });
  return Object.values(map).sort((x, y) => x.month - y.month);
};

/* Merge two [{status, count}] lists by status. */
const mergeStatus = (a = [], b = []) => {
  const map = {};
  [...a, ...b].forEach((r) => {
    const k = String(r.status || "pending");
    map[k] = (map[k] || 0) + Number(r.count || 0);
  });
  return Object.entries(map).map(([status, count]) => ({ status, count }));
};

/* ===================== GET DASHBOARD STATS ===================== */
const getDashboardStats = async (req, res) => {
  try {
    const manual = await manualStats();

    // Total Revenue (completed/delivered/paid orders + paid manual invoices)
    const [revenueRes] = await db.query(
      "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE payment_status = 'paid' OR status = 'delivered'"
    );
    const totalRevenue = Number(revenueRes[0].total_revenue || 0) + manual.revenue;

    // Total Product Orders (store orders + manual invoices holding products)
    const [ordersRes] = await db.query("SELECT COUNT(*) AS total_orders FROM orders");
    const totalOrders = Number(ordersRes[0].total_orders || 0) + manual.orders;

    // Total 3D Print Orders (print jobs + manual invoices holding prints)
    const [printOrdersRes] = await db.query("SELECT COUNT(*) AS total_print_orders FROM printing_orders");
    const totalPrintOrders = Number(printOrdersRes[0].total_print_orders || 0) + manual.printOrders;

    // Total Customers (registered + distinct manual bill-to profiles)
    const [usersRes] = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role = 'customer'");
    const totalUsers = Number(usersRes[0].total_users || 0) + manual.customers;

    // Total Products
    const [productsRes] = await db.query("SELECT COUNT(*) AS total_products FROM products WHERE is_active = 1");
    const totalProducts = productsRes[0].total_products;

    // Low stock products count (< 5)
    const [lowStockRes] = await db.query("SELECT COUNT(*) AS low_stock_count FROM products WHERE stock <= low_stock_threshold AND is_active = 1");
    const lowStockCount = lowStockRes[0].low_stock_count;

    // Pending Orders count
    const [pendingOrdersRes] = await db.query(
      "SELECT COUNT(*) AS pending_orders FROM orders WHERE status IN ('pending', 'confirmed', 'processing')"
    );
    const pendingOrders = pendingOrdersRes[0].pending_orders;

    // Recent 5 Product Orders (store + manual invoices, newest first)
    const [recentOrders] = await db.query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.payment_method, o.created_at,
              u.first_name, u.last_name, u.email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );
    const mergedRecent = [...recentOrders, ...manual.recent]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Recent 5 Print Orders
    const [recentPrintOrders] = await db.query(
      `SELECT po.id, po.order_number, po.file_name, po.total_amount, po.status, po.payment_status, po.created_at,
              u.first_name, u.last_name, u.email,
              m.name AS material_name, c.name AS color_name
       FROM printing_orders po
       LEFT JOIN users u ON po.user_id = u.id
       LEFT JOIN printing_materials m ON po.material_id = m.id
       LEFT JOIN printing_colors c ON po.color_id = c.id
       ORDER BY po.created_at DESC
       LIMIT 5`
    );

    // Top Selling Products (store units + manual invoice units)
    const [topProducts] = await db.query(
      `SELECT p.id, p.name, p.price, p.slug, p.stock,
              COALESCE(SUM(oi.quantity), 0) AS units_sold,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       GROUP BY p.id
       ORDER BY units_sold DESC
       LIMIT 5`
    );
    const mergedTop = topProducts
      .map((p) => ({
        ...p,
        units_sold: Number(p.units_sold || 0) + Number(manual.productUnits[p.id] || 0),
      }))
      .sort((a, b) => Number(b.units_sold) - Number(a.units_sold))
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        totalPrintOrders,
        totalUsers,
        totalProducts,
        lowStockCount,
        pendingOrders,
        recentOrders: mergedRecent,
        recentPrintOrders,
        topProducts: mergedTop,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ===================== GET SALES CHART DATA ===================== */
const getSalesChart = async (req, res) => {
  try {
    const manual = await manualStats();

    // Monthly sales for the current year (store orders + paid manual invoices)
    const [monthlySales] = await db.query(
      `SELECT 
         MONTH(created_at) AS month,
         MONTHNAME(created_at) AS month_name,
         COALESCE(SUM(total_amount), 0) AS total_sales,
         COUNT(*) AS order_count
       FROM orders
       WHERE YEAR(created_at) = YEAR(CURDATE()) AND (payment_status = 'paid' OR status = 'delivered')
       GROUP BY MONTH(created_at), MONTHNAME(created_at)
       ORDER BY month ASC`
    );

    // Order status distribution (store orders + mapped manual invoices)
    const [statusDistribution] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       GROUP BY status`
    );

    return res.status(200).json({
      success: true,
      data: {
        monthlySales: mergeMonthly(monthlySales, manual.monthly),
        statusDistribution: mergeStatus(statusDistribution, manual.status),
      },
    });
  } catch (error) {
    console.error("Admin sales chart error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getDashboardStats,
  getSalesChart,
};
