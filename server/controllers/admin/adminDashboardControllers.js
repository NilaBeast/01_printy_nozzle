const db = require("../../config/db");

/* ===================== GET DASHBOARD STATS ===================== */
const getDashboardStats = async (req, res) => {
  try {
    // Total Revenue (completed/delivered/paid orders)
    const [revenueRes] = await db.query(
      "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE payment_status = 'paid' OR order_status = 'delivered'"
    );
    const totalRevenue = revenueRes[0].total_revenue;

    // Total Product Orders
    const [ordersRes] = await db.query("SELECT COUNT(*) AS total_orders FROM orders");
    const totalOrders = ordersRes[0].total_orders;

    // Total 3D Print Orders
    const [printOrdersRes] = await db.query("SELECT COUNT(*) AS total_print_orders FROM printing_orders");
    const totalPrintOrders = printOrdersRes[0].total_print_orders;

    // Total Customers
    const [usersRes] = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role = 'customer'");
    const totalUsers = usersRes[0].total_users;

    // Total Products
    const [productsRes] = await db.query("SELECT COUNT(*) AS total_products FROM products WHERE is_active = 1");
    const totalProducts = productsRes[0].total_products;

    // Low stock products count (< 5)
    const [lowStockRes] = await db.query("SELECT COUNT(*) AS low_stock_count FROM products WHERE stock_quantity <= 5 AND is_active = 1");
    const lowStockCount = lowStockRes[0].low_stock_count;

    // Pending Orders count
    const [pendingOrdersRes] = await db.query(
      "SELECT COUNT(*) AS pending_orders FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing')"
    );
    const pendingOrders = pendingOrdersRes[0].pending_orders;

    // Recent 5 Product Orders
    const [recentOrders] = await db.query(
      `SELECT o.id, o.order_number, o.total_amount, o.order_status, o.payment_status, o.payment_method, o.created_at,
              u.first_name, u.last_name, u.email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    // Recent 5 Print Orders
    const [recentPrintOrders] = await db.query(
      `SELECT po.id, po.order_number, po.file_name, po.total_price, po.order_status, po.payment_status, po.created_at,
              u.first_name, u.last_name, u.email,
              m.name AS material_name, c.name AS color_name
       FROM printing_orders po
       LEFT JOIN users u ON po.user_id = u.id
       LEFT JOIN printing_materials m ON po.material_id = m.id
       LEFT JOIN printing_colors c ON po.color_id = c.id
       ORDER BY po.created_at DESC
       LIMIT 5`
    );

    // Top Selling Products
    const [topProducts] = await db.query(
      `SELECT p.id, p.title, p.price, p.slug, p.stock_quantity,
              COALESCE(SUM(oi.quantity), 0) AS units_sold,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       GROUP BY p.id
       ORDER BY units_sold DESC
       LIMIT 5`
    );

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
        recentOrders,
        recentPrintOrders,
        topProducts,
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
    // Monthly sales for the current year
    const [monthlySales] = await db.query(
      `SELECT 
         MONTH(created_at) AS month,
         MONTHNAME(created_at) AS month_name,
         COALESCE(SUM(total_amount), 0) AS total_sales,
         COUNT(*) AS order_count
       FROM orders
       WHERE YEAR(created_at) = YEAR(CURDATE()) AND (payment_status = 'paid' OR order_status = 'delivered')
       GROUP BY MONTH(created_at), MONTHNAME(created_at)
       ORDER BY month ASC`
    );

    // Order status distribution
    const [statusDistribution] = await db.query(
      `SELECT order_status, COUNT(*) AS count
       FROM orders
       GROUP BY order_status`
    );

    return res.status(200).json({
      success: true,
      data: {
        monthlySales,
        statusDistribution,
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
