"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface FinancePeriodContextType {
  month: number;
  year: number;
  monthLabel: string;
  periodLabel: string;
  isCurrentMonth: boolean;
  setPeriod: (month: number, year: number) => void;
  shiftMonth: (delta: number) => void;
  goToToday: () => void;
  periodQuery: string;
  linkWithPeriod: (path: string) => string;
}

const FinancePeriodContext = createContext<FinancePeriodContextType | undefined>(
  undefined,
);

function parsePeriodFromUrl(searchParams: URLSearchParams) {
  const now = new Date();
  const m = parseInt(searchParams.get("month") ?? "", 10);
  const y = parseInt(searchParams.get("year") ?? "", 10);
  return {
    month: m >= 1 && m <= 12 ? m : now.getMonth() + 1,
    year: y >= 2000 && y <= 2100 ? y : now.getFullYear(),
  };
}

export function FinancePeriodProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const now = new Date();

  const [month, setMonth] = useState(() => parsePeriodFromUrl(searchParams).month);
  const [year, setYear] = useState(() => parsePeriodFromUrl(searchParams).year);

  useEffect(() => {
    const parsed = parsePeriodFromUrl(searchParams);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [searchParams]);

  const syncUrl = useCallback(
    (m: number, y: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", String(m));
      params.set("year", String(y));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPeriod = useCallback(
    (m: number, y: number) => {
      setMonth(m);
      setYear(y);
      syncUrl(m, y);
    },
    [syncUrl],
  );

  const shiftMonth = useCallback(
    (delta: number) => {
      const d = new Date(year, month - 1 + delta, 1);
      setPeriod(d.getMonth() + 1, d.getFullYear());
    },
    [month, year, setPeriod],
  );

  const goToToday = useCallback(() => {
    setPeriod(now.getMonth() + 1, now.getFullYear());
  }, [setPeriod, now]);

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const periodQuery = `month=${month}&year=${year}`;

  const linkWithPeriod = useCallback(
    (path: string) => {
      const sep = path.includes("?") ? "&" : "?";
      return `${path}${sep}${periodQuery}`;
    },
    [periodQuery],
  );

  const value = useMemo<FinancePeriodContextType>(
    () => ({
      month,
      year,
      monthLabel: MONTH_LABELS[month - 1] ?? "",
      periodLabel: `${MONTH_LABELS[month - 1] ?? ""} ${year}`,
      isCurrentMonth,
      setPeriod,
      shiftMonth,
      goToToday,
      periodQuery,
      linkWithPeriod,
    }),
    [
      month,
      year,
      isCurrentMonth,
      setPeriod,
      shiftMonth,
      goToToday,
      periodQuery,
      linkWithPeriod,
    ],
  );

  return (
    <FinancePeriodContext.Provider value={value}>
      {children}
    </FinancePeriodContext.Provider>
  );
}

export function useFinancePeriod() {
  const ctx = useContext(FinancePeriodContext);
  if (!ctx) {
    throw new Error("useFinancePeriod debe usarse dentro de FinancePeriodProvider");
  }
  return ctx;
}

export { MONTH_LABELS };
