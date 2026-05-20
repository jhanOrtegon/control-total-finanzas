"use client";

import React from "react";
import { AlertCenter } from "@/components/alerts/alert-center";
import { BudgetPaceCard } from "@/components/charts/budget-pace-card";

export default function AlertsPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <AlertCenter />
      <BudgetPaceCard />
    </div>
  );
}
