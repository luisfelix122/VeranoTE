import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Manejo de CORS pre-flight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Inicializar Cliente Supabase con Service Role (Admin)
        // REGLA: Usar 'SERVICE_ROLE_KEY' explícitamente como pidió el Arquitecto.
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuración incompleta: Faltan SUPABASE_URL o SERVICE_ROLE_KEY');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 2. Leer datos del request
        const { email, password, meta } = await req.json();

        if (!email || !password) {
            throw new Error('Email y password son obligatorios');
        }

        console.log(`[Edge Function] Creando usuario: ${email}`);

        // 3. Crear usuario en Auth (sin loguear, solo crear)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-verificar email
            user_metadata: meta  // Metadatos críticos para los Triggers
        });

        if (error) {
            // Si el usuario ya existe, no es un error fatal para el seed, pero informamos.
            if (error.message.includes("already been registered") || error.status === 422) {
                return new Response(
                    JSON.stringify({ message: `El usuario ${email} ya existe.`, exists: true }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            throw error;
        }

        return new Response(
            JSON.stringify({ user: data.user, message: "Usuario creado correctamente" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(`[Edge Function Error]`, error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
