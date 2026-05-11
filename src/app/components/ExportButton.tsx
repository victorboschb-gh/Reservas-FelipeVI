'use client';

import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Reservation } from '@/lib/db';

export default function ExportButton({
  reservations,
  dateString
}: {
  reservations: Reservation[];
  dateString: string;
}) {
  const handleExport = () => {
    // Prepare data for Excel
    const data = reservations.map((res, index) => ({
      'Código': res.id.substring(0,4).toUpperCase(),
      'Nº de Ingreso': index + 1,
      'Nombre': res.name,
      'Email': res.email,
      'Teléfono': res.phone || '',
      'Comidas': res.portions,
      'Alérgenos': res.allergens?.join(', ') || 'Ninguno',
      'Notas Alérgenos': res.allergens_notes || '',
      'Fecha de Reserva': new Date(res.created_at).toLocaleString('es-ES')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');

    // Auto-size columns loosely
    const wscols = [
      { wch: 8 }, // Código
      { wch: 15 }, // Nº Ingreso
      { wch: 30 }, // Nombre
      { wch: 35 }, // Email
      { wch: 15 }, // Teléfono
      { wch: 10 }, // Comidas
      { wch: 30 }, // Alérgenos
      { wch: 40 }, // Notas Alérgenos
      { wch: 25 }, // Fecha de Reserva
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Reservas_${dateString}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={reservations.length === 0}
      className="flex items-center gap-2 bg-sky-500 hover:bg-sky-500 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" />
      Exportar Excel
    </button>
  );
}
