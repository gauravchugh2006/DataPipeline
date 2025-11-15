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

const AdminCustomersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "updatedAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "customer",
    password: "",
  });
  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phone: "",
    role: "customer",
  });

  const queryArgs = useMemo(() => {
    const activeSort = sorting[0];
    return {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sortBy: activeSort?.id || "updatedAt",
      sortDir: activeSort?.desc === false ? "asc" : "desc",
      search: search.trim() || undefined,
      role: roleFilter || undefined,
    };
  }, [pagination, sorting, search, roleFilter]);

  const queryKey = [
    "admin-customers",
    queryArgs.page,
    queryArgs.pageSize,
    queryArgs.sortBy,
    queryArgs.sortDir,
    queryArgs.search || "",
    queryArgs.role || "",
  ];

  const fetchCustomers = async () => {
    const params = filterEmpty(queryArgs);
    const { data } = await apiClient.get("/admin/customers", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: fetchCustomers,
    enabled: Boolean(token),
    keepPreviousData: true,
  });

  const invalidateCustomers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: created } = await apiClient.post("/admin/customers", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return created;
    },
    onSuccess: () => invalidateCustomers(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data: updated } = await apiClient.patch(
        `/admin/customers/${id}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return updated;
    },
    onSuccess: () => invalidateCustomers(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/admin/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return id;
    },
    onSuccess: () => invalidateCustomers(),
  });

  const startEdit = (customer) => {
    setEditingId(customer.id);
    setDraft({
      email: customer.email,
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      role: customer.role || "customer",
      password: "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ email: "", firstName: "", lastName: "", phone: "", role: "customer", password: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updates = {
      email: draft.email,
      firstName: draft.firstName,
      lastName: draft.lastName,
      phone: draft.phone,
      role: draft.role,
    };
    if (draft.password) {
      updates.password = draft.password;
    }
    await updateMutation.mutateAsync({ id: editingId, updates });
    cancelEdit();
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!createForm.password) {
      return;
    }
    await createMutation.mutateAsync({
      email: createForm.email,
      firstName: createForm.firstName,
      lastName: createForm.lastName,
      password: createForm.password,
      phone: createForm.phone || undefined,
      role: createForm.role,
    });
    setCreateForm({ email: "", firstName: "", lastName: "", password: "", phone: "", role: "customer" });
  };

  const handleDelete = async (customer) => {
    const confirmation = window.confirm(
      `Remove ${customer.email}? Their login access will be revoked.`
    );
    if (!confirmation) return;
    await deleteMutation.mutateAsync(customer.id);
  };

  const handleExport = async (format) => {
    const params = filterEmpty(queryArgs);
    const { data: blobData } = await apiClient.get(
      `/admin/customers/export/${format}`,
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
    link.download = `customers-export.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              type="email"
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.email}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          ) : (
            <span className="font-medium">{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor("firstName", {
        header: "First name",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.firstName}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, firstName: event.target.value }))
              }
            />
          ) : (
            info.getValue()
          ),
      }),
      columnHelper.accessor("lastName", {
        header: "Last name",
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.lastName}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, lastName: event.target.value }))
              }
            />
          ) : (
            info.getValue()
          ),
      }),
      columnHelper.accessor("role", {
        header: "Role",
        enableSorting: false,
        cell: (info) =>
          editingId === info.row.original.id ? (
            <select
              className="rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.role}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, role: event.target.value }))
              }
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          ) : (
            <span className="capitalize">{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        enableSorting: false,
        cell: (info) =>
          editingId === info.row.original.id ? (
            <input
              className="w-full rounded-lg border border-cafe-primary/20 px-2 py-1 text-sm"
              value={draft.phone}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          ) : (
            info.getValue() || "—"
          ),
      }),
      columnHelper.accessor("signupDate", {
        header: "Signup",
        enableSorting: false,
        cell: (info) =>
          info.getValue() ? new Date(info.getValue()).toLocaleDateString() : "—",
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
          const rowCustomer = info.row.original;
          const isEditing = editingId === rowCustomer.id;
          return (
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <input
                    type="password"
                    placeholder="New password (optional)"
                    className="rounded-lg border border-cafe-primary/20 px-2 py-1 text-xs"
                    value={draft.password}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
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
                    onClick={() => startEdit(rowCustomer)}
                    className="inline-flex items-center gap-1 rounded-full border border-cafe-primary/30 px-3 py-1 text-xs text-cafe-primary"
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rowCustomer)}
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
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-cafe-primary/10 bg-cafe-cream/30 p-4 shadow-sm md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-col">
            <label htmlFor="admin-customer-email" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Email
            </label>
            <input
              id="admin-customer-email"
              type="email"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-customer-first-name" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              First name
            </label>
            <input
              id="admin-customer-first-name"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.firstName}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, firstName: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-customer-last-name" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Last name
            </label>
            <input
              id="admin-customer-last-name"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.lastName}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, lastName: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-customer-password" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Password
            </label>
            <input
              id="admin-customer-password"
              type="password"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, password: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-customer-phone" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Phone
            </label>
            <input
              id="admin-customer-phone"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.phone}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="admin-customer-role" className="text-xs uppercase tracking-wide text-cafe-primary/60">
              Role
            </label>
            <select
              id="admin-customer-role"
              className="rounded-lg border border-cafe-primary/20 px-3 py-2 text-sm"
              value={createForm.role}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, role: event.target.value }))
              }
            >
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-cafe-primary px-4 py-2 text-sm font-semibold text-white shadow-md"
            disabled={createMutation.isPending}
          >
            <FiPlus /> Add customer
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
            onClick={() => invalidateCustomers()}
            className="inline-flex items-center gap-2 rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search by name or email"
          className="w-full rounded-full border border-cafe-primary/20 px-4 py-2 text-sm md:w-72"
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            setSearch(event.target.value);
          }}
        />
        <select
          className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
          value={roleFilter}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            setRoleFilter(event.target.value);
          }}
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
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
                  Loading customers…
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
                  No customers found for the applied filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-xs text-cafe-primary/60">
          Page {data?.page || 1} of {data?.totalPages || 1} • {data?.total || 0} customers
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

export default AdminCustomersPage;

