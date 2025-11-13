import React from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "../hooks/useProducts.js";

const SupportForm = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm();

  const onSubmit = async (values) => {
    await apiClient.post("/support/contact", values);
    reset();
  };

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow">
      <h2 className="text-2xl font-semibold mb-2">Talk to our concierge team</h2>
      <p className="text-sm text-cafe-primary/70 mb-6">
        Submit a feature request, corporate booking, or feedback. Our admin team responds within 24h.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Name</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("name", { required: true })}
          />
          {errors.name && <p className="text-xs text-red-500">Name is required.</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Email</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("email", { required: true })}
          />
          {errors.email && <p className="text-xs text-red-500">Valid email is required.</p>}
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Topic</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("topic", { required: true })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold uppercase text-cafe-primary/60">Message</label>
          <textarea
            rows={4}
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("message", { required: true, minLength: 10 })}
          />
          {errors.message && (
            <p className="text-xs text-red-500">Share at least 10 characters so we can help.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="md:col-span-2 rounded-full bg-cafe-primary text-white px-8 py-3 font-semibold shadow"
        >
          {isSubmitting ? "Sending…" : "Send message"}
        </button>
        {isSubmitSuccessful && (
          <p className="md:col-span-2 text-sm text-cafe-accent">We received your message. Merci!</p>
        )}
      </form>
    </div>
  );
};

export default SupportForm;
