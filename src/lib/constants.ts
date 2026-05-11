export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'crustaceos', label: 'Crustáceos', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'huevos', label: 'Huevos', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'pescado', label: 'Pescado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'cacahuetes', label: 'Cacahuetes', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'soja', label: 'Soja', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'lacteos', label: 'Lácteos', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'frutos_cascara', label: 'Frutos de cáscara', color: 'bg-yellow-800 text-white border-yellow-900' },
  { id: 'apio', label: 'Apio', color: 'bg-lime-100 text-lime-800 border-lime-200' },
  { id: 'mostaza', label: 'Mostaza', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { id: 'sesamo', label: 'Granos de sésamo', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  { id: 'sulfitos', label: 'Sulfitos', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'altramuces', label: 'Altramuces', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'moluscos', label: 'Moluscos', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' }
];

export function getAllergenByLabel(label: string) {
  return ALLERGENS.find(a => a.label === label);
}
