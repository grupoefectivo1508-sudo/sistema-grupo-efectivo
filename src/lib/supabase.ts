import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key-replace-with-real-key';

// En modo demo (sin .env configurado) las llamadas a Supabase fallarán silenciosamente.
// Para habilitar la base de datos real, crea un archivo .env con las claves de tu proyecto Supabase.
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;
if (isDemoMode) {
  console.info('[Grupo Efectivo] Modo DEMO activo. Los datos son ficticios hasta configurar Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export { isDemoMode };

