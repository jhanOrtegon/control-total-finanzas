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
  { name: "Salud", emoji: "🏥", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  { name: "Mamá", emoji: "👩", color: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20" },
  { name: "Educación", emoji: "🎓", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { name: "Mascotas", emoji: "🐱", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { name: "Viajes", emoji: "✈️", color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
  { name: "Regalos", emoji: "🎁", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  { name: "Suscripciones", emoji: "📱", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { name: "Hogar", emoji: "🏡", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  { name: "Belleza", emoji: "💄", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  { name: "Préstamos", emoji: "🤝", color: "text-lime-600 bg-lime-500/10 border-lime-500/20" },
  { name: "Ingresos", emoji: "💵", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { name: "Otros", emoji: "💼", color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
];

export const getCategoryEmoji = (categoryName: string): string => {
  return CATEGORIES_LIST.find((c) => c.name === categoryName)?.emoji || "💼";
};

export const getCategoryColor = (categoryName: string): string => {
  return CATEGORIES_LIST.find((c) => c.name === categoryName)?.color || "text-slate-500 bg-slate-500/10 border-slate-500/20";
};
