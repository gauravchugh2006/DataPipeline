import React, { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiDownload,
  FiEdit2,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { apiClient } from "../../hooks/useProducts.js";
import { useAuth } from "../../context/AuthContext.jsx";

const columnHelper = createColumnHelper();

const filterEmpty = (record) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) =>
      value !== undefined && value !== null && value !== ""
    )
  );

const AdminOrdersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "order_date", desc: true }]);
  const [statusFilter, setStatusFilter] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ paymentStatus: "Pending", transactionStatus: "Pending" });

  const queryArgs = useMemo(() => {
    const activeSort = sorting[0];
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy: activeSort?.id || "order_date",
      sortDir: activeSort?.desc === false ? "asc" : "desc",
      status: statusFilter || undefined,
      transactionStatus: transactionFilter || undefined,
      search: search.trim() || undefined,
    };
  }, [pagination, sorting, statusFilter, transactionFilter, search]);

  const queryKey = [
    "admin-orders",
    queryArgs.page,
    queryArgs.pageSize,
    queryArgs.sortBy,
    queryArgs.sortDir,
    queryArgs.status || "",
    queryArgs.transactionStatus || "",
    queryArgs.search || "",
  ];

  const fetchOrders = async () => {
    const params = filterEmpty(queryArgs);
    const { data } = await apiClient.get("/admin/orders", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: fetchOrders,
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const invalidateOrders = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data: updated } = await apiClient.patch(
        `/admin/orders/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return updated;
    },
    onSuccess: () => invalidateOrders(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    },
    onSuccess: () => invalidateOrders(),
  });

  const startEdit = (order) => {
    setEditingId(order.id);
    setDraft({
      paymentStatus: order.paymentStatus || "Pending",
      transactionStatus: order.payment?.status || "Pending",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ paymentStatus: "Pending", transactionStatus: "Pending" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      updates: {
        paymentStatus: draft.paymentStatus,
        payment: { status: draft.transactionStatus },
      },
    });
    cancelEdit();
  };

  const handleDelete = async (order) => {
    const confirmation = window.confirm(
      `Delete order #${order.id}? This cannot be undone.`
    );
    if (!confirmation) return;
    await deleteMutation.mutateAsync(order.id);
  };

  const handleExport = async (format) => {
    const params = filterEmpty(queryArgs);
    const { data: blobData } = await apiClient.get(
      `/admin/orders/export/${format}`,
      {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );
    const blob = new Blob([blobData], {
      type:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Order #",
        enableSorting: false,
        cell: (info) => <span className="font-medium">#{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.customer?.email || "—", {
        id: "customer",
        header: "Customer",
        enableSorting: false,
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("totalAmount", {
        id: "total",
        header: "Total (€)",
        cell: (info) => `€${Number(info.getValue() || 0).toFixed(2)}`,
      }),
      columnHelper.accessor("paymentStatus", {
        id: "status",
        header: "Payment status",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <select
              className="rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.paymentStatus}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, paymentStatus: event.target.value }))
              }
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          ) : (
            info.getValue()
          ),
      }),
      columnHelper.accessor((row) => row.payment?.status || "Pending", {
        id: "payment",
        header: "Transaction status",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <select
              className="rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.transactionStatus}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  transactionStatus: event.target.value,
                }))
              }
            >
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          ) : (
            info.getValue()
          ),
      }),
      columnHelper.accessor("orderDate", {
        id: "order_date",
        header: "Ordered",
        cell: (info) =>
          info.getValue() ? new Date(info.getValue()).toLocaleString() : "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const rowOrder = info.row.original;
          const isEditing = editingId === rowOrder.id;
          return (
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="inline-flex items-center gap-1 rounded-full bg-cafe-primary px-3 py-1 text-xs font-semibold text-white"
                    disabled={updateMutation.isPending}
                  >
                    <FiSave /> Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded-full border border-cafe-primary/20 px-3 py-1 text-xs"
                  >
                    <FiX /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(rowOrder)}
                    className="inline-flex items-center gap-1 rounded-full border border-cafe-primary/30 px-3 py-1 text-xs text-cafe-primary"
                  >
                    <FiEdit2 /> Update
                  </button>
                  <button
                    onClick={() => handleDelete(rowOrder)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-1 text-xs text-red-600"
                    disabled={deleteMutation.isPending}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </>
              )}
            </div>
          );
        },
      }),
    ],
    [draft, editingId, updateMutation.isPending, deleteMutation.isPending]
  );

  const table = useReactTable({
    data: data?.items || [],
    columns,
    state: { sorting },
    manualSorting: true,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Search by ID, product, or email"
            className="w-full rounded-full border border-cafe-primary/20 px-4 py-2 text-sm md:w-72"
            value={search}
            onChange={(event) => {
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              setSearch(event.target.value);
            }}
          />
          <select
            className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => {
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              setStatusFilter(event.target.value);
            }}
          >
            <option value="">All payment statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
          <select
            className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
            value={transactionFilter}
            onChange={(event) => {
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              setTransactionFilter(event.target.value);
            }}
          >
            <option value="">All transaction statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/30 px-4 py-2 text-sm text-cafe-primary"
          >
            <FiDownload /> CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/30 px-4 py-2 text-sm text-cafe-primary"
          >
            <FiDownload /> XLSX
          </button>
          <button
            onClick={() => invalidateOrders()}
            className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-cafe-primary/10 text-sm">
          <thead className="bg-cafe-cream/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-xs text-cafe-primary/70"
                    onClick={header.column.getToggleSortingHandler?.()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: "▲",
                        desc: "▼",
                      }[header.column.getIsSorted()] || null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-cafe-primary/10">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-cafe-primary/60">
                  Loading orders…
                </td>
              </tr>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-cafe-cream/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top text-cafe-primary">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-cafe-primary/60">
                  No orders match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-cafe-primary/60">
          Page {data?.page || 1} of {data?.totalPages || 1} • {data?.total || 0} orders
        </p>
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm disabled:opacity-40"
            onClick={() =>
              setPagination((prev) => ({ ...prev, pageIndex: Math.max(prev.pageIndex - 1, 0) }))
            }
            disabled={pagination.pageIndex === 0 || isFetching}
          >
            Previous
          </button>
          <button
            className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm disabled:opacity-40"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                pageIndex: Math.min(prev.pageIndex + 1, (data?.totalPages || 1) - 1),
              }))
            }
            disabled={
              pagination.pageIndex >= (data?.totalPages || 1) - 1 || isFetching
            }
          >
            Next
          </button>
          <select
            className="rounded-full border border-cafe-primary/20 px-3 py-2 text-sm"
            value={pagination.pageSize}
            onChange={(event) =>
              setPagination({ pageIndex: 0, pageSize: Number(event.target.value) })
            }
          >
            {[10, 25, 50, 75, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;

