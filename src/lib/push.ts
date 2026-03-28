import { supabase } from './supabase';

/**
 * Converte uma chave VAPID string em Uint8Array para uso no subscribe
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Solicita permissão e inscreve o navegador para notificações push
 */
export async function subscribeToPush(usuarioCodigo: number, vapidPublicKey: string) {
  console.log('DEBUG: Iniciando subscribeToPush para usuário:', usuarioCodigo);
  
  // 1. Solicita Permissão explicitamente
  const permission = await Notification.requestPermission();
  console.log('DEBUG: Permissão de notificação:', permission);
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada pelo usuário.');
  }

  const registration = await navigator.serviceWorker.ready;
  
  // 2. Verifica se já existe uma inscrição
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
  }

  // Prepara dados para o Supabase
  const payload = {
    usuario_codigo: usuarioCodigo,
    endpoint: subscription.endpoint,
    auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
    p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
    updated_at: new Date().toISOString()
  };
  
  console.log('DEBUG: Enviando payload ao Supabase...', payload);

  // Salva no Supabase
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(payload);

  if (error) {
    console.error('❌ ERRO CRÍTICO NO SUPABASE:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  console.log('✅ SUCESSO AO SALVAR NO BANCO:', data);
  return subscription;
}

/**
 * Remove a inscrição do navegador e do banco
 */
export async function unsubscribeFromPush(usuarioCodigo: number) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    
    // Remove do banco
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('usuario_codigo', usuarioCodigo)
      .eq('endpoint', subscription.endpoint);
      
    if (error) throw error;
  }
}

/**
 * Verifica se já existe uma inscrição ativa para este navegador
 */
export async function checkPushSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}
