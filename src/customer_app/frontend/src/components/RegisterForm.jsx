import React from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const themeOptions = [
  { value: "sunrise", label: "Sunrise (warm pastel)" },
  { value: "lavender-dusk", label: "Lavender Dusk" },
  { value: "mint-contrast", label: "Mint Contrast" },
  { value: "rose-quartz", label: "Rose Quartz" },
  { value: "midnight", label: "Midnight (dark mode)" },
  { value: "noir", label: "Noir (high contrast)" },
];

const RegisterForm = () => {
  const { setSession } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      gender: "male",
      theme: themeOptions[0].value,
    },
  });

  const onSubmit = async (values) => {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phone: values.phone,
      address: values.address,
      gender: values.gender,
      theme: values.theme,
    };
    const { data } = await apiClient.post("/auth/register", payload);
    setSession(data.token, data.profile);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 bg-white/70 backdrop-blur rounded-3xl p-6 card-shadow"
    >
      <h3 className="text-lg font-semibold">Create your signature profile</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-cafe-primary/70">First name</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("firstName", { required: true })}
          />
          {errors.firstName && <p className="text-xs text-red-500">Tell us your first name.</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm text-cafe-primary/70">Last name</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("lastName", { required: true })}
          />
          {errors.lastName && <p className="text-xs text-red-500">We need your surname.</p>}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Email</label>
        <input
          type="email"
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("email", { required: true })}
        />
        {errors.email && <p className="text-xs text-red-500">Valid email required.</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Password</label>
        <input
          type="password"
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("password", { required: true, minLength: 8 })}
        />
        {errors.password && <p className="text-xs text-red-500">8 characters minimum.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-cafe-primary/70">Phone</label>
          <input
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("phone")}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-cafe-primary/70">Gender</label>
          <select
            className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
            {...register("gender")}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Address</label>
        <textarea
          rows={2}
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("address")}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Preferred theme</label>
        <select
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("theme")}
        >
          {themeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-cafe-accent text-white py-3 font-semibold"
      >
        {isSubmitting ? "Creating…" : "Create account"}
      </button>
    </form>
  );
};

export default RegisterForm;
