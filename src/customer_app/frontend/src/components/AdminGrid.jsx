import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useAdminData } from "../hooks/useAdminData";
import { useMutation } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

const AdminGrid = ({ entity, title, queryClient }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [editDraft, setEditDraft] = useState({ id: "", field: "", value: "" });
  const [createDraft, setCreateDraft] = useState({});
  const { data, isLoading, error } = useAdminData(entity, pageIndex + 1, pageSize);

  const records = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: async ({ method, id, payload }) => {
      const url = id ? `/api/admin/${entity}/${id}` : `/api/admin/${entity}`;
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": "admin"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to persist admin change");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", entity] });
      setEditDraft({ id: "", field: "", value: "" });
      setCreateDraft({});
    }
  });

  const columns = useMemo(() => {
    if (!records.length) {
      return [];
    }
    return Object.keys(records[0]).map((key) =>
      columnHelper.accessor(key, {
        header: key,
        cell: (info) => info.getValue()
      })
    );
  }, [records]);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      pagination: { pageIndex, pageSize }
    },
    onPaginationChange: (updater) => {
      const nextState = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(nextState.pageIndex ?? pageIndex);
      setPageSize(nextState.pageSize ?? pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const exportData = async (format) => {
    const response = await fetch(`/api/admin/${entity}?format=${format}`, {
      headers: {
        "x-admin-role": "admin"
      }
    });
    if (!response.ok) {
      throw new Error("Export failed");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${entity}.${format}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!editDraft.id || !editDraft.field) {
      return;
    }
    mutation.mutate({
      method: "PUT",
      id: editDraft.id,
      payload: { [editDraft.field]: editDraft.value }
    });
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({ method: "POST", payload: createDraft });
  };

  return (
    <section className="admin-grid">
      <header>
        <div>
          <h2>{title}</h2>
          <p>Inline edit entities with automatic audit columns and exports.</p>
        </div>
        <div className="grid-actions">
          <button type="button" onClick={() => exportData("csv")}>
            Export CSV
          </button>
          <button type="button" onClick={() => exportData("xlsx")}>
            Export XLSX
          </button>
        </div>
      </header>
      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">{error.message}</p>}
      {!isLoading && !error && columns.length > 0 && (
        <div className="grid-table" role="table" aria-label={`${title} grid`}>
          <div role="rowgroup" className="grid-header">
            {table.getHeaderGroups().map((headerGroup) => (
              <div role="row" key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <span role="columnheader" key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div role="rowgroup" className="grid-body">
            {table.getRowModel().rows.map((row) => (
              <div role="row" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <span role="cell" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <footer className="grid-footer">
        <button
          type="button"
          onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
          disabled={pageIndex === 0}
        >
          Previous
        </button>
        <span>Page {pageIndex + 1}</span>
        <button type="button" onClick={() => setPageIndex(pageIndex + 1)}>
          Next
        </button>
        <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size} rows
            </option>
          ))}
        </select>
      </footer>

      <section className="grid-forms">
        <form onSubmit={handleEditSubmit} className="edit-form">
          <h3>Edit row</h3>
          <label htmlFor={`${entity}-edit-id`}>ID</label>
          <input
            id={`${entity}-edit-id`}
            name="id"
            value={editDraft.id}
            onChange={(event) => setEditDraft((current) => ({ ...current, id: event.target.value }))}
            required
          />
          <label htmlFor={`${entity}-edit-field`}>Field</label>
          <input
            id={`${entity}-edit-field`}
            name="field"
            value={editDraft.field}
            onChange={(event) => setEditDraft((current) => ({ ...current, field: event.target.value }))}
            required
          />
          <label htmlFor={`${entity}-edit-value`}>Value</label>
          <input
            id={`${entity}-edit-value`}
            name="value"
            value={editDraft.value}
            onChange={(event) => setEditDraft((current) => ({ ...current, value: event.target.value }))}
            required
          />
          <button type="submit" disabled={mutation.isLoading}>
            Save change
          </button>
        </form>

        <form onSubmit={handleCreateSubmit} className="create-form">
          <h3>Create row</h3>
          <p>Provide JSON payload for new entity.</p>
          <textarea
            value={JSON.stringify(createDraft, null, 2)}
            onChange={(event) => {
              try {
                const parsed = JSON.parse(event.target.value || "{}");
                setCreateDraft(parsed);
              } catch (parseError) {
                // ignore parse error – user will correct
              }
            }}
          />
          <button type="submit" disabled={mutation.isLoading}>
            Create
          </button>
        </form>
      </section>

      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
      {mutation.isSuccess && <p>Changes saved.</p>}
    </section>
  );
};

AdminGrid.propTypes = {
  entity: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  queryClient: PropTypes.object.isRequired
};

export default AdminGrid;
