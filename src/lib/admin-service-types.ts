import type { SupportServiceCategory } from '@/lib/types';

export type ServiceAdminInput = {
  name: string;
  category: SupportServiceCategory;
  zone?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  whatsapp_number?: string;
  website_url?: string;
  description?: string;
  is_active?: boolean;
  is_verified?: boolean;
  source_url?: string;
  notes?: string;
};

export type ServiceAdminRow = {
  id: number;
  name: string;
  category: SupportServiceCategory;
  zone: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp_number: string | null;
  website_url: string | null;
  description: string | null;
  is_active: boolean;
  is_verified: boolean;
  source_url: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};
