// Push notifications & service worker helpers

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.warn("[Notifications] Failed to request permission:", err);
    return false;
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("[SW] Registration failed:", err);
  }
}

export function showBrowserNotification(
  title: string,
  body: string,
  tag?: string,
  url?: string,
): void {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification(title, { body, tag, icon: "/favicon.ico" });
  if (url) n.onclick = () => window.focus();
}

export function schedulePaymentReminders(
  expenses: { title: string; status: string; due_date: string | null }[],
  debts: { title: string; minimum_payment: number; due_date: string | null }[],
): void {
  if (typeof window === "undefined") return;
  const today = new Date();
  const todayStr = today.toDateString();
  const lastReminder = localStorage.getItem("lastPaymentReminderDate");
  if (lastReminder === todayStr) return;

  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  const upcoming = expenses.filter((e) => {
    if (e.status === "paid" || !e.due_date) return false;
    const due = new Date(e.due_date);
    return due >= today && due <= soon;
  });

  if (upcoming.length > 0) {
    showBrowserNotification(
      `⏰ ${upcoming.length} pago(s) próximos`,
      upcoming.map((e) => e.title).join(", "),
      "payment-reminder",
    );
    localStorage.setItem("lastPaymentReminderDate", todayStr);
  }
}

export function checkOverduePayments(
  expenses: { title: string; status: string; due_date: string | null }[],
  _debts: unknown[],
): void {
  if (typeof window === "undefined") return;
  const today = new Date();
  const todayStr = today.toDateString();
  const lastOverdue = localStorage.getItem("lastOverdueCheckDate");
  if (lastOverdue === todayStr) return;

  const overdue = expenses.filter((e) => {
    if (e.status === "paid" || !e.due_date) return false;
    return new Date(e.due_date) < today;
  });

  if (overdue.length > 0) {
    showBrowserNotification(
      `🚨 ${overdue.length} pago(s) vencidos`,
      overdue.map((e) => e.title).join(", "),
      "overdue-alert",
    );
    localStorage.setItem("lastOverdueCheckDate", todayStr);
  }
}
