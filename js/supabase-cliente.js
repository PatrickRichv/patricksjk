// Un solo cliente de Supabase para todo el panel (admin.js, admin-auth.js y admin-catalogo.js),
// así comparten la misma sesión del administrador.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config-supabase.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
