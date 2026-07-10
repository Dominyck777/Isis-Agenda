import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

export const getDeviceInfo = async () => {
  return { platform: 'android', model: 'Native Device' };
};

export const setupPushNotifications = async (userId?: string) => {
  console.log(`Setting up push for user: ${userId}`);
  // Solicita permissão
  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }
  if (permStatus.receive !== 'granted') {
    console.error('User denied push permission');
    return;
  }

  // Registra no FCM
  await PushNotifications.register();

  // Ouvintes de Eventos
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    // TODO: Salvar o token no Supabase (ex: na tabela usuarios ou push_tokens)
    // if (userId) {
    //   await supabase.from('push_tokens').upsert({ user_id: userId, token: token.value });
    // }
  });

  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
    // Quando recebido com app aberto, o capacitor geralmente não mostra a notificação na barra de status automaticamente
    // Se quiser mostrar um Toast/Alert aqui, é possível.
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};

export const showNotification = async (title: string, body: string) => {
  // Pode ser usado para Notificações Locais no futuro
  console.log(`[Android Notification Triggered] ${title}: ${body}`);
};

export const exitApp = async () => {
  await App.exitApp();
};
