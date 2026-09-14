import cartService from "../services/cart.service";

export const notifyCartChange = () => {
  window.dispatchEvent(new Event("cartChange"));
};

/**
 * Refresh the localStorage cart mirror from the server cart (logged-in users)
 * so the navbar badge stays accurate, then notify listeners.
 * Failures are non-fatal — the badge simply keeps its last value.
 */
export const syncCartBadge = async () => {
  try {
    if (!localStorage.getItem("token")) {
      notifyCartChange();
      return;
    }
    const response = await cartService.getCart();
    const items = (response.data?.cart?.items || []).map((item) => {
      const isPrint = item.item_type === "print" || item.is_print || item.product_id == null;
      return {
        id: item.id,
        productId: isPrint ? null : item.product_id,
        name: isPrint ? item.name || (item.file_name ? `3D Print — ${item.file_name}` : "Custom 3D Print") : item.name,
        image: item.image || (isPrint ? "/images/rocket.png" : undefined),
        price: Number(item.unit_price ?? item.print_unit_price ?? item.price ?? 0),
        quantity: Number(item.quantity || 1),
        isCustomPrint: isPrint,
        isPrint,
      };
    });
    localStorage.setItem("printy_cart", JSON.stringify(items));
  } catch (error) {
    /* badge keeps last value */
  } finally {
    notifyCartChange();
  }
};
