import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const NotificationContext = createContext();

const toneClasses = {
  info: "bg-white/90 text-cafe-primary border border-cafe-primary/10 shadow-cafe-primary/10",
  success: "bg-emerald-500 text-white shadow-emerald-500/40",
  error: "bg-rose-500 text-white shadow-rose-500/40",
  warning: "bg-amber-400 text-cafe-primary shadow-amber-400/60",
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const timers = useRef(new Map());

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    ({ title, message, tone = "info", duration = 4000, id }) => {
      const identifier = id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((prev) => [...prev, { id: identifier, title, message, tone }]);
      if (duration !== null) {
        const timer = setTimeout(() => removeNotification(identifier), duration);
        timers.current.set(identifier, timer);
      }
      return identifier;
    },
    [removeNotification]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ notify, removeNotification }),
    [notify, removeNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
        {notifications.map((note) => {
          const toneClass = toneClasses[note.tone] || toneClasses.info;
          return (
            <div
              key={note.id}
              className={`pointer-events-auto rounded-3xl border shadow-lg backdrop-blur px-4 py-3 ${toneClass}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {note.title && <p className="text-sm font-semibold leading-tight">{note.title}</p>}
                  {note.message && (
                    <p className="text-sm opacity-90 leading-snug mt-1">{note.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="text-xs font-semibold uppercase tracking-wide opacity-80 hover:opacity-100"
                  onClick={() => removeNotification(note.id)}
                >
                  Close
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
