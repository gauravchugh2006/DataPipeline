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
  FiPlus,
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

const AdminProductsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "updatedAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", category: "", price: "", imageUrl: "" });
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    price: "",
    imageUrl: "",
  });

  const queryArgs = useMemo(() => {
    const activeSort = sorting[0];
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy: activeSort?.id || "updatedAt",
      sortDir: activeSort?.desc === false ? "asc" : "desc",
      search: search.trim() || undefined,
      category: category || undefined,
    };
  }, [pagination, sorting, search, category]);

  const queryKey = [
    "admin-products",
    queryArgs.page,
    queryArgs.pageSize,
    queryArgs.sortBy,
    queryArgs.sortDir,
    queryArgs.search || "",
    queryArgs.category || "",
  ];

  const fetchProducts = async () => {
    const params = filterEmpty(queryArgs);
    const { data } = await apiClient.get("/admin/products", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: fetchProducts,
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const invalidateProducts = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: created } = await apiClient.post("/admin/products", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return created;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data: updated } = await apiClient.patch(
        `/admin/products/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return updated;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });

  const startEdit = (product) => {
    setEditingId(product.id);
    setDraft({
      name: product.name || "",
      category: product.category || "",
      price: product.price?.toString() || "",
      imageUrl: product.imageUrl || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ name: "", category: "", price: "", imageUrl: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateMutation.mutateAsync({
      id: editingId,
      updates: {
        name: draft.name,
        category: draft.category,
        price: draft.price ? Number(draft.price) : undefined,
        imageUrl: draft.imageUrl || null,
      },
    });
    cancelEdit();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!createForm.name || !createForm.category || !createForm.price) {
      return;
    }
    await createMutation.mutateAsync({
      name: createForm.name,
      category: createForm.category,
      price: Number(createForm.price),
      imageUrl: createForm.imageUrl || undefined,
    });
    setCreateForm({ name: "", category: "", price: "", imageUrl: "" });
  };

  const handleDelete = async (product) => {
    const confirmation = window.confirm(
      `Delete ${product.name}? This action cannot be undone.`
    );
    if (!confirmation) return;
    await deleteMutation.mutateAsync(product.id);
  };

  const handleExport = async (format) => {
    const params = filterEmpty(queryArgs);
    const { data: blobData } = await apiClient.get(
      `/admin/products/export/${format}`,
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
    link.download = `products-export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => info.getValue(),
        enableSorting: false,
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          ) : (
            <span className="font-medium text-cafe-primary">{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.category}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, category: event.target.value }))
              }
            />
          ) : (
            <span>{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor("price", {
        header: "Price (€)",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-24 rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.price}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, price: event.target.value }))
              }
            />
          ) : (
            <span>€{Number(info.getValue() || 0).toFixed(2)}</span>
          ),
      }),
      columnHelper.accessor("updatedAt", {
        header: "Last updated",
        cell: (info) =>
          info.getValue()
            ? new Date(info.getValue()).toLocaleString()
            : "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const rowProduct = info.row.original;
          const isEditing = editingId === rowProduct.id;
          return (
            <div className="flex items-center gap-2">
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
                    onClick={() => startEdit(rowProduct)}
                    className="inline-flex items-center gap-1 rounded-full border border-cafe-primary/30 px-3 py-1 text-xs text-cafe-primary"
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rowProduct)}
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-cafe-primary/10 bg-cafe-cream/30 p-4 shadow-sm md:flex-row md:items-end">
          <div className="flex flex-col">
            <label htmlFor="admin-product-name" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Name
            </label>
            <input
              id="admin-product-name"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-product-category" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Category
            </label>
            <input
              id="admin-product-category"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.category}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, category: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-product-price" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Price (€)
            </label>
            <input
              id="admin-product-price"
              type="number"
              min="0"
              step="0.01"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.price}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, price: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-product-image" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Image URL
            </label>
            <input
              id="admin-product-image"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.imageUrl}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, imageUrl: event.target.value }))
              }
              placeholder="https://…"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-cafe-primary px-4 py-2 text-sm font-semibold text-white shadow-md"
            disabled={createMutation.isPending}
          >
            <FiPlus /> Add product
          </button>
        </form>

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
            onClick={() => invalidateProducts()}
            className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search by name or ID"
          className="w-full rounded-full border border-cafe-primary/20 px-4 py-2 text-sm md:w-72"
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            setSearch(event.target.value);
          }}
        />
        <select
          className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
          value={category}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            setCategory(event.target.value);
          }}
        >
          <option value="">All categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Apparel">Apparel</option>
          <option value="Books">Books</option>
          <option value="Home Goods">Home Goods</option>
          <option value="Sports">Sports</option>
        </select>
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
                  Loading products…
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
                  No products found for the applied filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-cafe-primary/60">
          Page {data?.page || 1} of {data?.totalPages || 1} • {data?.total || 0} products
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

export default AdminProductsPage;

