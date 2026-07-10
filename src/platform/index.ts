import { Capacitor } from '@capacitor/core';
import * as androidPlatform from './android';
import * as browserPlatform from './browser';

/**
 * Verifica se a aplicação está rodando num ambiente nativo (Android/iOS)
 */
export const isNative = Capacitor.isNativePlatform();

/**
 * Camada de Abstração: `platform` expõe métodos que têm dupla implementação.
 * Se rodando no Android, usará os plugins do Capacitor.
 * Se rodando no Web/Browser, usará mocks ou APIs nativas do navegador.
 * 
 * Exemplo de uso:
 * import { platform } from '@/platform';
 * await platform.showNotification('Olá', 'Notificação abstraída');
 */
export const platform = isNative ? androidPlatform : browserPlatform;
