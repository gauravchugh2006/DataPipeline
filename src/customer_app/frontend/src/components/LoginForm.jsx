import React from "react";
import { useForm } from "react-hook-form";

import { apiClient } from "../hooks/useProducts.js";
import { useAuth } from "../context/AuthContext.jsx";

const LoginForm = () => {
  const { setSession } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  const onSubmit = async (values) => {
    const { data } = await apiClient.post("/auth/login", values);
    setSession(data.token, data.profile);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 bg-white/70 backdrop-blur rounded-3xl p-6 card-shadow">
      <h3 className="text-lg font-semibold">Welcome back</h3>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Email</label>
        <input
          type="email"
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("email", { required: true })}
        />
        {errors.email && <p className="text-xs text-red-500">Email is required.</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm text-cafe-primary/70">Password</label>
        <input
          type="password"
          className="w-full rounded-2xl border border-cafe-primary/10 px-4 py-3"
          {...register("password", { required: true })}
        />
        {errors.password && <p className="text-xs text-red-500">Password is required.</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-cafe-primary text-white py-3 font-semibold"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
};

export default LoginForm;
