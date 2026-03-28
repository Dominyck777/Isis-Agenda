import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as webpush from "https://esm.sh/web-push@3.6.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record, table, type } = await req.json();

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const subject = "mailto:contato@fluxo7.com";

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    let recipientId = null;
    let title = "Isis Agenda";
    let body = "";

    if (table === "agendamentos") {
      recipientId = record.codigo_profissional;
      const dataHora = new Date(record.data_hora_inicio).toLocaleString('pt-BR');
      
      if (type === "INSERT") {
        title = "📅 Novo Agendamento";
        body = `Novo horário marcado para ${dataHora}`;
      } else if (type === "UPDATE" && record.status === "cancelado") {
        title = "❌ Cancelamento";
        body = `O horário de ${dataHora} foi cancelado.`;
      }
    }

    if (!recipientId) return new Response("Ok (sem destinatário)");

    // Busca subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("usuario_codigo", recipientId);

    if (subs) {
      for (const sub of subs) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          };
          await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body, url: '/' }));
        } catch (e) {
          console.error("Erro ao enviar push:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
