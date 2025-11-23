import React, { useEffect, useMemo, useState } from "react";
import { FaBell, FaCheckCircle, FaClock, FaEnvelope, FaMobile } from "react-icons/fa";

import { useReminderBundles, useReminderPreferences, useSaveReminderPreferences } from "./api.js";
import { useAnalytics } from "../../hooks/useAnalytics.js";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", helper: "Great for flash offers and new arrivals" },
  { value: "weekly", label: "Weekly", helper: "Balanced digest delivered every Monday" },
  { value: "monthly", label: "Monthly", helper: "Highlights and key loyalty perks" },
  { value: "quarterly", label: "Quarterly", helper: "Seasonal check-ins and bundles" },
];

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: <FaEnvelope className="mr-2" /> },
  { value: "push", label: "Push", icon: <FaMobile className="mr-2" /> },
  { value: "sms", label: "SMS", icon: <FaMobile className="mr-2" /> },
];

const BundleCard = ({ bundle, selected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(bundle)}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cafe-accent/60 ${
        selected ? "border-cafe-accent bg-cafe-accent/10" : "border-cafe-primary/10 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-cafe-primary">{bundle.name}</p>
          <p className="text-xs uppercase tracking-wide text-cafe-primary/50">
            {bundle.productCount} featured items
          </p>
        </div>
        {selected && <FaCheckCircle className="text-cafe-accent text-xl" />}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {bundle.products.map((product) => (
          <div key={product.id} className="rounded-xl bg-white/70 px-3 py-2 text-sm text-cafe-primary/80">
            <p className="font-semibold">{product.name}</p>
            <p>€{Number(product.price).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </button>
  );
};

const ReminderSettings = () => {
  const { data: bundles = [], isLoading: bundlesLoading } = useReminderBundles();
  const { data: preferences, isLoading: preferencesLoading } = useReminderPreferences();
  const { mutate: savePreferences, isPending: saving } = useSaveReminderPreferences();
  const { trackEvent } = useAnalytics();

  const [localState, setLocalState] = useState({
    frequency: "weekly",
    channel: "email",
    bundlePreferences: [],
    quietHours: "",
  });
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalState({
        frequency: preferences.frequency || "weekly",
        channel: preferences.channel || "email",
        bundlePreferences: preferences.bundlePreferences || [],
        quietHours: preferences.quietHours || "",
      });
      setHasSaved(false);
    }
  }, [preferences]);

  const selectedBundleIds = useMemo(
    () => new Set((localState.bundlePreferences || []).map((bundle) => bundle.id || bundle)),
    [localState.bundlePreferences]
  );

  const toggleBundle = (bundle) => {
    setHasSaved(false);
    setLocalState((prev) => {
      const id = bundle.id;
      const alreadySelected = selectedBundleIds.has(id);
      const updated = alreadySelected
        ? prev.bundlePreferences.filter((item) => (item.id || item) !== id)
        : [...prev.bundlePreferences, bundle];
      trackEvent("reminder_bundle_toggled", {
        bundleId: id,
        selected: !alreadySelected,
      });
      return { ...prev, bundlePreferences: updated };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setHasSaved(false);
    const payload = {
      frequency: localState.frequency,
      channel: localState.channel,
      bundlePreferences: localState.bundlePreferences.map((bundle) =>
        bundle.id ? { id: bundle.id, name: bundle.name } : bundle
      ),
      quietHours: localState.quietHours || null,
    };
    savePreferences(payload, {
      onSuccess: () => {
        setHasSaved(true);
      },
    });
  };

  const adherenceStatus = preferences?.adherenceStatus;
  const nextScheduled = preferences?.nextScheduled
    ? new Date(preferences.nextScheduled).toLocaleString()
    : null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-lg shadow-cafe-primary/5 border border-cafe-primary/10">
      <header className="flex items-center gap-3 pb-4 border-b border-cafe-primary/10">
        <FaBell className="text-cafe-accent text-2xl" />
        <div>
          <h3 className="text-xl font-semibold text-cafe-primary">Reminder preferences</h3>
          <p className="text-sm text-cafe-primary/60">
            Control cadence, delivery channels, and bundles used in your loyalty nudges.
          </p>
        </div>
      </header>
      <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs uppercase tracking-wide text-cafe-primary/50">Frequency</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-4 shadow-sm transition ${
                  localState.frequency === option.value
                    ? "border-cafe-accent bg-cafe-accent/10"
                    : "border-cafe-primary/10 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cafe-primary">{option.label}</span>
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={localState.frequency === option.value}
                    onChange={(event) => {
                      setHasSaved(false);
                      setLocalState((prev) => ({ ...prev, frequency: event.target.value }));
                    }}
                    className="h-4 w-4"
                  />
                </div>
                <p className="mt-2 text-sm text-cafe-primary/60">{option.helper}</p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-cafe-primary/50">Delivery channel</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {CHANNEL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center rounded-2xl border px-4 py-3 shadow-sm transition ${
                  localState.channel === option.value
                    ? "border-cafe-accent bg-cafe-accent/10"
                    : "border-cafe-primary/10 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="channel"
                  value={option.value}
                  checked={localState.channel === option.value}
                  onChange={(event) => {
                    setHasSaved(false);
                    setLocalState((prev) => ({ ...prev, channel: event.target.value }));
                  }}
                  className="mr-3 h-4 w-4"
                />
                <span className="flex items-center text-sm font-semibold text-cafe-primary">
                  {option.icon}
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-cafe-primary/50">Product bundles</p>
            {bundlesLoading && <span className="text-xs text-cafe-primary/50">Loading bundles…</span>}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {bundles.map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                selected={selectedBundleIds.has(bundle.id)}
                onToggle={toggleBundle}
              />
            ))}
            {!bundles.length && !bundlesLoading && (
              <p className="rounded-2xl border border-dashed border-cafe-primary/20 p-6 text-center text-sm text-cafe-primary/60">
                No bundle suggestions yet. Add products to categories to populate recommendations.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-cafe-primary/50">Quiet hours (optional)</span>
            <input
              type="text"
              value={localState.quietHours}
              placeholder="e.g. 21:00 - 08:00"
              onChange={(event) => {
                setHasSaved(false);
                setLocalState((prev) => ({ ...prev, quietHours: event.target.value }));
              }}
              className="mt-2 rounded-2xl border border-cafe-primary/10 px-4 py-3"
            />
          </label>
          <div className="rounded-2xl border border-cafe-primary/10 bg-slate-50 px-4 py-3 text-sm text-cafe-primary/70">
            <div className="flex items-center gap-2">
              <FaClock className="text-cafe-accent" />
              <p className="font-semibold">Schedule preview</p>
            </div>
            <p className="mt-2">
              {preferencesLoading
                ? "Calculating next reminder…"
                : nextScheduled
                ? `Next reminder on ${nextScheduled}`
                : "We will calculate the next reminder once saved."}
            </p>
            {adherenceStatus && (
              <p className="mt-1 text-xs uppercase tracking-wide text-cafe-primary/50">
                Status: {adherenceStatus.replace("-", " ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          {hasSaved && (
            <span className="text-sm font-semibold text-emerald-600">
              Preferences saved and queued for delivery.
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto rounded-full bg-cafe-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cafe-primary/20 disabled:cursor-not-allowed disabled:bg-cafe-primary/50"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ReminderSettings;
