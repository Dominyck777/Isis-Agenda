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
      // 1. BUscar o Nome do Cliente
      let clientName = "Cliente";
      if (record.codigo_cliente === 0 || record.codigo_cliente === "avulso") {
        if (record.observacao?.startsWith('👤 ')) {
          clientName = record.observacao.split(' | ')[0].replace('👤 ', '');
        } else {
          clientName = "Cliente Avulso";
        }
      } else if (record.codigo_cliente) {
        const { data: clin } = await supabase.from('clientes').select('nome').eq('id', record.codigo_cliente).maybeSingle();
        if (clin) clientName = clin.nome;
      }

      // 2. Buscar o Nome dos Serviços
      let serviceNames = "";
      let rawServices = record.servicos_selecionados;
      if (typeof rawServices === 'string') {
        try { rawServices = JSON.parse(rawServices); } catch(e) { rawServices = []; }
      }
      
      if (Array.isArray(rawServices) && rawServices.length > 0) {
        const { data: servs } = await supabase.from('servicos').select('nome').in('codigo', rawServices.map((s: any) => Number(s)));
        if (servs) serviceNames = servs.map((s: any) => s.nome).join(', ');
      }

      const dataHora = record.data_hora_inicio 
        ? new Date(record.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
        : "Horário não definido";

      if (type === "INSERT") {
        title = `📅 Novo: ${clientName}`;
        body = `Marcou ${serviceNames || 'Serviço'} para ${dataHora}.`;
      } 
      else if (type === "UPDATE") {
        const statusAlterado = record.status !== old_record?.status;
        const horarioAlterado = record.data_hora_inicio !== old_record?.data_hora_inicio;
        
        // Filtro Rigoroso: Ignora qualquer mudança para status de "fluxo" (Início ou Fim)
        const isStatusWorkflow = record.status === "em andamento" || record.status === "finalizado";

        if (statusAlterado && record.status === "cancelado") {
          title = `❌ Agendamento Cancelado`;
          body = `${clientName} das ${dataHora} foi cancelado.`;
        } else if (horarioAlterado && !isStatusWorkflow) {
          title = `🔄 Alterado: ${clientName}`;
          body = `O horário para ${serviceNames || 'serviço'} foi atualizado para ${dataHora}.`;
        } else {
          return new Response("Ignorado: Alteração de fluxo de status ou irrelevante");
        }
      } 
      else if (type === "DELETE") {
        // No caso de DELETE, os dados estão em 'old_record'
        let clientName = "Cliente";
        if (old_record.codigo_cliente === 0 || old_record.codigo_cliente === "avulso") {
          if (old_record.observacao?.startsWith('👤 ')) {
            clientName = old_record.observacao.split(' | ')[0].replace('👤 ', '');
          } else {
            clientName = "Cliente Avulso";
          }
        } else if (old_record.codigo_cliente) {
           const { data: clin } = await supabase.from('clientes').select('nome').eq('id', old_record.codigo_cliente).maybeSingle();
           if (clin) clientName = clin.nome;
        }

        const dataHora = old_record.data_hora_inicio 
          ? new Date(old_record.data_hora_inicio).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
          : "Horário não definido";

        title = `❌ Agendamento Cancelado`;
        body = `${clientName} das ${dataHora} foi cancelado na agenda.`;
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
          // URL removida do payload conforme solicitado
          await webpush.sendNotification(pushSubscription, JSON.stringify({ title, body }));
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
