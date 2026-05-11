'use client';

import { Download } from 'lucide-react';

export default function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button 
      onClick={handlePrint}
      className="w-full flex justify-center items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 py-3.5 rounded-2xl shadow-sm transition-all font-semibold"
    >
      <Download className="w-5 h-5" />
      Guardar como PDF / Imprimir
    </button>
  );
}
