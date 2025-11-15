import React, { useEffect, useMemo, useState } from "react";

import LoginForm from "./LoginForm.jsx";
import RegisterForm from "./RegisterForm.jsx";
import SupportForm from "./SupportForm.jsx";
import MapEmbed from "./MapEmbed.jsx";
import OrderHistory from "./OrderHistory.jsx";
import ProductFilters from "./ProductFilters.jsx";
import ProductGrid from "./ProductGrid.jsx";
import ReminderSettings from "../features/loyalty/ReminderSettings.jsx";

const themeOptions = [
  { value: "sunrise", label: "Sunrise" },
  { value: "lavender-dusk", label: "Lavender Dusk" },
  { value: "mint-contrast", label: "Mint Contrast" },
  { value: "rose-quartz", label: "Rose Quartz" },
  { value: "midnight", label: "Midnight" },
  { value: "noir", label: "Noir" },
];

const avatarStyles = [
  { value: "thumbs", label: "Rounded" },
  { value: "lorelei", label: "Soft" },
  { value: "croodles", label: "Playful" },
  { value: "bottts", label: "Tech" },
];

const Dashboard = ({
  profile,
  theme,
  orders,
  orderLoading,
  orderFilters,
  onOrderFiltersChange,
  refreshOrders,
  products,
  productFilters,
  onProductFiltersChange,
  productLoading,
  onThemeChange,
  onProfileUpdate,
}) => {
  const isAuthenticated = Boolean(profile);

  const [formState, setFormState] = useState(() => ({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    gender: profile?.gender || "other",
    theme: profile?.theme || theme || "sunrise",
    avatarStyle: profile?.avatarStyle || "thumbs",
    profileImage: undefined,
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      gender: profile?.gender || "other",
      theme: profile?.theme || theme || prev.theme,
      avatarStyle: profile?.avatarStyle || prev.avatarStyle,
      profileImage: undefined,
    }));
  }, [profile, theme]);

  const baseAvatar = profile?.avatar;
  const computedAvatar = useMemo(() => {
    const seed = `${profile?.firstName || formState.firstName || "Guest"}-${profile?.lastName || formState.lastName || "User"}`;
    const style = (profile?.gender || formState.gender) === "female" ? "lorelei" : "thumbs";
    const fallback = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&radius=50`;
    if (typeof formState.profileImage === "string") {
      return formState.profileImage;
    }
    if (formState.profileImage === null) {
      return fallback;
    }
    if (baseAvatar) {
      return baseAvatar;
    }
    return fallback;
  }, [formState.profileImage, formState.firstName, formState.lastName, formState.gender, baseAvatar, profile]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleThemeSelect = (event) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, theme: value }));
    onThemeChange(value);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, profileImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarReset = () => {
    setFormState((prev) => ({ ...prev, profileImage: null }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!onProfileUpdate) return;
    setSaving(true);
    try {
      const payload = {
        firstName: formState.firstName,
        lastName: formState.lastName,
        phone: formState.phone,
        address: formState.address,
        gender: formState.gender,
        theme: formState.theme,
        avatarStyle: formState.avatarStyle,
      };
      if (formState.profileImage !== undefined) {
        payload.profileImage = formState.profileImage;
      }
      await onProfileUpdate(payload);
      setFormState((prev) => ({ ...prev, profileImage: undefined }));
    } catch (error) {
      console.error("Unable to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  const mergeOrderFilters = (update) => {
    if (!onOrderFiltersChange) return;
    if (typeof update === "function") {
      onOrderFiltersChange(update);
    } else {
      onOrderFiltersChange((prev) => ({ ...prev, ...update }));
    }
  };

  const mergeProductFilters = (update) => {
    if (!onProductFiltersChange) return;
    if (typeof update === "function") {
      onProductFiltersChange(update);
    } else {
      onProductFiltersChange((prev) => ({ ...prev, ...update }));
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-8 xl:grid-cols-[280px,1fr]">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 card-shadow border border-cafe-primary/10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={computedAvatar}
                  alt={profile?.fullName || "Customer avatar"}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-md object-cover"
                />
                <label
                  className={`absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cafe-primary text-white text-xs shadow ${
                    isAuthenticated ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  ✎
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={!isAuthenticated}
                  />
                </label>
              </div>
              <div className="text-sm text-cafe-primary/80">
                <p className="text-base font-semibold text-cafe-primary">
                  {profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Guest"}
                </p>
                <p>{profile?.email}</p>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleAvatarReset}
                    className="mt-2 text-xs uppercase tracking-wide text-cafe-primary/60"
                  >
                    Reset avatar
                  </button>
                )}
              </div>
            </div>
            {isAuthenticated ? (
              <form className="space-y-3" onSubmit={handleProfileSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs uppercase text-cafe-primary/60">First name</label>
                  <input
                    name="firstName"
                    value={formState.firstName}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-cafe-primary/60">Last name</label>
                  <input
                    name="lastName"
                    value={formState.lastName}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-cafe-primary/60">Phone</label>
                <input
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-cafe-primary/60">Address</label>
                <textarea
                  name="address"
                  value={formState.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs uppercase text-cafe-primary/60">Gender</label>
                  <select
                    name="gender"
                    value={formState.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-cafe-primary/60">Avatar style</label>
                  <select
                    name="avatarStyle"
                    value={formState.avatarStyle}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
                  >
                    {avatarStyles.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-cafe-primary/60">Theme</label>
                <select
                  name="theme"
                  value={formState.theme}
                  onChange={handleThemeSelect}
                  className="w-full rounded-2xl border border-cafe-primary/10 px-3 py-2 text-sm"
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
                  disabled={saving}
                  className="w-full rounded-full bg-cafe-primary text-white py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-cafe-primary/70">
                Sign in to personalise your avatar, contact details, and theme.
              </p>
            )}
          </div>
          <ProductFilters
            filters={productFilters}
            onChange={mergeProductFilters}
            onReset={() => mergeProductFilters({ page: 1, pageSize: 25, sort: "name", category: "", minPrice: "", maxPrice: "", search: "" })}
          />
          {!profile && (
            <div className="space-y-4">
              <RegisterForm />
              <LoginForm />
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 card-shadow space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {profile ? `Welcome back, ${profile.firstName}!` : "Personalised dashboard"}
                </h2>
                <p className="text-sm text-cafe-primary/70">
                  Filter, sort, and download your café commerce order history.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshOrders}
                className="rounded-full border border-cafe-primary/20 px-4 py-2 text-sm"
              >
                Refresh
              </button>
            </div>
            <OrderHistory
              data={orders}
              loading={orderLoading}
              filters={orderFilters}
              onFiltersChange={mergeOrderFilters}
            />
          </div>
          <div className="bg-white rounded-3xl p-6 card-shadow space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Product catalogue</h3>
                <p className="text-sm text-cafe-primary/70">
                  Browse 25 items per page with thumbnails, names, and prices.
                </p>
              </div>
              <div className="text-xs uppercase tracking-wide text-cafe-primary/50">
                Theme: {theme}
              </div>
            </div>
            <ProductGrid
              data={products}
              isLoading={productLoading}
              onPageChange={(page) => mergeProductFilters({ page })}
            />
          </div>
          {isAuthenticated && <ReminderSettings />}
          <SupportForm />
          <MapEmbed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
