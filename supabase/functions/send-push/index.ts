import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as webpush from "https://esm.sh/web-push@3.6.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { record, old_record, table, type } = payload;

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    webpush.setVapidDetails("mailto:contato@fluxo7.com", publicKey, privateKey);
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    let recipientId = record?.codigo_profissional;
    let title = "";
    let body = "";

    if (table === "agendamentos") {
      const dataHora = record.data_hora_inicio 
        ? new Date(record.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
        : "Horário não definido";

      if (type === "INSERT") {
        title = "📅 Novo Agendamento";
        body = `Um novo horário foi marcado para ${dataHora}.`;
      } 
      else if (type === "UPDATE") {
        const statusAlterado = record.status !== old_record?.status;
        const horarioAlterado = record.data_hora_inicio !== old_record?.data_hora_inicio;
        
        // Filtro: Ignora transições automáticas de status (início e fim de atendimento)
        const isAutomaticStatusChange = 
          (old_record?.status === "agendado" && record.status === "em andamento") ||
          (old_record?.status === "em andamento" && record.status === "finalizado");

        if (statusAlterado && record.status === "cancelado") {
          title = "❌ Agendamento Cancelado";
          body = `O horário de ${dataHora} foi cancelado.`;
        } else if (!isAutomaticStatusChange && (statusAlterado || horarioAlterado)) {
          title = "🔄 Agendamento Alterado";
          body = `O agendamento para ${dataHora} foi atualizado.`;
        } else {
          // Ignora updates secundários ou automáticos
          return new Response("Ignorado: Sem alterações manuais relevantes");
        }
      }
    } 
    else if (payload.test) {
      title = "🔔 Teste de Notificação";
      body = "Suas notificações push estão funcionando!";
      recipientId = payload.usuario_codigo;
    }

    if (!title || !recipientId) {
      return new Response("Ignorado: Payload não reconhecido ou sem destinatário");
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("usuario_codigo", recipientId);

    if (!subs || subs.length === 0) {
       return new Response("Nenhum dispositivo encontrado.");
    }

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          };
          await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body, url: '/' }));
        } catch (e) {
          console.error("Erro no envio:", e.message);
        }
      })
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
