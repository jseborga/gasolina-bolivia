import type { SupportServiceCategory } from '@/lib/types';

export const SUPPORT_SERVICE_OPTIONS: Array<{
  label: string;
  value: SupportServiceCategory;
}> = [
  { label: 'Taller mecánico', value: 'taller_mecanico' },
  { label: 'Grúa', value: 'grua' },
  { label: 'Servicio mecánico', value: 'servicio_mecanico' },
  { label: 'Aditivos', value: 'aditivos' },
];

export function getSupportServiceLabel(category: SupportServiceCategory) {
  return (
    SUPPORT_SERVICE_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}
