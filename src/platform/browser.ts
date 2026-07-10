export const getDeviceInfo = async () => {
  return { platform: 'web', model: navigator.userAgent };
};

export const setupPushNotifications = async (userId?: string) => {
  console.log(`[Browser] setupPushNotifications chamado para user: ${userId}. Tratado pelo sw.js nativamente na web.`);
  // A versão web já lida com Push via sw.js e navegador.
};

export const showNotification = async (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else {
    console.log(`[Browser Notification] ${title}: ${body}`);
  }
};

export const exitApp = async () => {
  console.log('[Browser] exitApp chamado. Sem efeito na Web.');
};
