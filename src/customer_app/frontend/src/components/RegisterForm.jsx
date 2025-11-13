import React from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const RegisterForm = () => {
  const { setToken } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    const { data } = await apiClient.post("/auth/register", values);
    setToken(data.token);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 bg-white/70 backdrop-blur rounded-3xl p-6 card-shadow">
      <h3 className="text-lg font-semibold">Create your signature profile</h3>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Full name</label>
        <input
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("name", { required: true })}
        />
        {errors.name && <p className="text-xs text-red-500">We need your name.</p>}
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
