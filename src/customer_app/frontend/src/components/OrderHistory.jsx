import React from "react";

import InvoiceButton from "./InvoiceButton.jsx";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Refunded", label: "Refunded" },
];

const paymentStatuses = [
  { value: "", label: "All transactions" },
  { value: "Completed", label: "Completed" },
  { value: "Pending", label: "Pending" },
  { value: "Refunded", label: "Refunded" },
];

const paymentMethods = [
  { value: "", label: "Any method" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "PayPal", label: "PayPal" },
  { value: "Bank Transfer", label: "Bank Transfer" },
];

const sortOptions = [
  { value: "order_date", label: "Order date" },
  { value: "total", label: "Total amount" },
  { value: "status", label: "Order status" },
  { value: "payment", label: "Payment status" },
];

const OrderHistory = ({ data, loading, filters, onFiltersChange }) => {
  const orders = data?.items || [];
  const page = data?.page || 1;
  const totalPages = data?.totalPages || 1;
  const activeFilters = filters || {};

  const updateFilter = (name, value) => {
    if (!onFiltersChange) return;
    const nextValue = name === "page" ? Number(value) : value;
    onFiltersChange({
      ...activeFilters,
      [name]: nextValue,
      page: name === "page" ? Number(nextValue) : 1,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Search</label>
          <input
            type="search"
            value={activeFilters.search || ""}
            onChange={(event) => updateFilter("search", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
            placeholder="Order # or product name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Order status</label>
          <select
            value={activeFilters.status || ""}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Payment method</label>
          <select
            value={activeFilters.paymentMethod || ""}
            onChange={(event) => updateFilter("paymentMethod", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          >
            {paymentMethods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Transaction status</label>
          <select
            value={activeFilters.transactionStatus || ""}
            onChange={(event) => updateFilter("transactionStatus", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          >
            {paymentStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">From</label>
          <input
            type="date"
            value={activeFilters.startDate || ""}
            onChange={(event) => updateFilter("startDate", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">To</label>
          <input
            type="date"
            value={activeFilters.endDate || ""}
            onChange={(event) => updateFilter("endDate", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Sort by</label>
          <select
            value={activeFilters.sortBy || "order_date"}
            onChange={(event) => updateFilter("sortBy", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase text-cafe-primary/60">Direction</label>
          <select
            value={activeFilters.sortDir || "desc"}
            onChange={(event) => updateFilter("sortDir", event.target.value)}
            className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto border border-cafe-primary/10 rounded-3xl">
        <table className="min-w-full divide-y divide-cafe-primary/10 text-sm">
          <thead className="bg-cafe-primary/5 text-xs uppercase tracking-wide text-cafe-primary/60">
            <tr>
              <th className="px-4 py-3 text-left">Order</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-left">Order status</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cafe-primary/10">
            {loading ? (
              [...Array(5)].map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-4 py-4" colSpan={7}>
                    <div className="h-4 bg-cafe-primary/10 rounded" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-cafe-primary/60" colSpan={7}>
                  No orders found for the selected filters.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-cafe-primary">#{order.id}</div>
                    <div className="text-xs text-cafe-primary/60">
                      {order.customer
                        ? [order.customer.firstName, order.customer.lastName]
                            .filter(Boolean)
                            .join(" ") || `Customer #${order.customerId}`
                        : `Customer #${order.customerId}`}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-cafe-primary/80">
                    {new Date(order.orderDate).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-cafe-primary/80">
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={`${order.id}-${item.productId}`}>
                          {item.quantity || 1} × {item.productName} — €{Number(item.price).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-cafe-primary/10 px-3 py-1 text-xs font-semibold text-cafe-primary">
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-cafe-primary/80">
                    {order.payment ? (
                      <div className="space-y-1">
                        <div className="font-medium">{order.payment.method}</div>
                        <div className="text-xs text-cafe-primary/60">{order.payment.status}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-cafe-primary/50">No payment recorded</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-cafe-primary">
                    €{Number(order.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <InvoiceButton orderId={order.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-cafe-primary/70">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateFilter("page", Math.max(page - 1, 1))}
            disabled={page === 1 || loading}
            className="rounded-full border border-cafe-primary/20 px-4 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => updateFilter("page", Math.min(page + 1, totalPages))}
            disabled={page === totalPages || loading}
            className="rounded-full border border-cafe-primary/20 px-4 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
