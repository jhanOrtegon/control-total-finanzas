export interface CategoryInfo {
  name: string;
  emoji: string;
  color: string;
}

export const CATEGORIES_LIST: CategoryInfo[] = [
  { name: "Comida", emoji: "🍎", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { name: "Vivienda", emoji: "🏠", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { name: "Servicios", emoji: "⚡", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { name: "Transporte", emoji: "🚘", color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  { name: "Entretenimiento", emoji: "🎬", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { name: "Compras", emoji: "🛍️", color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
  { name: "Ingresos", emoji: "💵", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { name: "Otros", emoji: "💼", color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
];

export const getCategoryEmoji = (categoryName: string): string => {
  return CATEGORIES_LIST.find((c) => c.name === categoryName)?.emoji || "💼";
};

export const getCategoryColor = (categoryName: string): string => {
  return CATEGORIES_LIST.find((c) => c.name === categoryName)?.color || "text-slate-500 bg-slate-500/10 border-slate-500/20";
};
