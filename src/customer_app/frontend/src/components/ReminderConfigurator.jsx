import { useMemo, useState } from "react";
import { useReminderConfigurations } from "../hooks/useReminderConfigurations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const channels = ["email", "sms", "push"];
const frequencies = ["daily", "weekly", "monthly"];

const ReminderConfigurator = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customer_id: "",
    product_id: "",
    preferred_channel: "email",
    reminder_frequency: "weekly",
    quiet_hours_start: "",
    quiet_hours_end: ""
  });

  const { data, isLoading, error } = useReminderConfigurations();

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const response = await fetch("/api/reminders/configurations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": "csr"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to persist reminder preference");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder-configurations"] });
    }
  });

  const tableRows = useMemo(() => data?.data ?? [], [data]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  return (
    <section className="reminder-configurator">
      <form className="reminder-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="customer_id">Customer ID</label>
          <input id="customer_id" name="customer_id" value={form.customer_id} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="product_id">Product ID</label>
          <input id="product_id" name="product_id" value={form.product_id} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="preferred_channel">Channel</label>
          <select id="preferred_channel" name="preferred_channel" value={form.preferred_channel} onChange={handleChange}>
            {channels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reminder_frequency">Frequency</label>
          <select id="reminder_frequency" name="reminder_frequency" value={form.reminder_frequency} onChange={handleChange}>
            {frequencies.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quiet_hours_start">Quiet hours start</label>
          <input id="quiet_hours_start" name="quiet_hours_start" value={form.quiet_hours_start} onChange={handleChange} placeholder="21:00" />
        </div>
        <div>
          <label htmlFor="quiet_hours_end">Quiet hours end</label>
          <input id="quiet_hours_end" name="quiet_hours_end" value={form.quiet_hours_end} onChange={handleChange} placeholder="07:00" />
        </div>
        <button type="submit" disabled={mutation.isLoading}>
          {mutation.isLoading ? "Saving…" : "Save preference"}
        </button>
      </form>

      <section aria-live="polite" className="reminder-feedback">
        {mutation.isError && <p role="alert">{mutation.error.message}</p>}
        {mutation.isSuccess && <p>Preference saved.</p>}
      </section>

        <section className="reminder-table">
        <h2>Existing preferences</h2>
        {isLoading && <p>Loading preferences…</p>}
        {error && <p role="alert">{error.message}</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Channel</th>
                <th>Frequency</th>
                <th>Quiet hours</th>
                <th>Last modified</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={`${row.customer_id}-${row.product_id}`}>
                  <td>{row.customer_id}</td>
                  <td>{row.product_id}</td>
                  <td>{row.preferred_channel}</td>
                  <td>{row.reminder_frequency}</td>
                  <td>
                    {row.quiet_hours_start || "—"} → {row.quiet_hours_end || "—"}
                  </td>
                  <td>{new Date(row.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
};

export default ReminderConfigurator;
