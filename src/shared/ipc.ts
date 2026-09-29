// Single IPC contract (doc 02). Preload and main handlers are typed against it.
import type {
  AppSettings,
  FileOpResult,
  HttpResult,
  InitResult,
  MenuCommand,
  NewRequestArgs,
  OpenRequestArgs,
  Profile,
  RecentEntry,
  ResolvedRequest,
  SaveReason,
  SaveResult,
  ToastMessage,
} from './types';

/** Renderer → main, request/response (ipcRenderer.invoke / ipcMain.handle). */
export interface InvokeChannels {
  'app:init': { args: []; result: InitResult };
  'profile:save': { args: [payload: { profile: Profile; reason: SaveReason }]; result: SaveResult };
  'file:new': { args: [payload: NewRequestArgs]; result: FileOpResult };
  'file:open': { args: [payload: OpenRequestArgs]; result: FileOpResult };
  'file:relocate': { args: [payload: { profile: Profile }]; result: FileOpResult };
  'file:reveal': { args: []; result: boolean };
  'file:remove-recent': { args: [path: string]; result: RecentEntry[] };
  'file:pick-attachment': { args: []; result: string | null };
  'settings:get': { args: []; result: AppSettings };
  'settings:update': { args: [patch: Partial<AppSettings>]; result: AppSettings };
  'app:zoom': { args: [dir: 'in' | 'out' | 'reset']; result: number };
  'app:quit': { args: []; result: void };
  'http:send': { args: [payload: { requestId: string; resolved: ResolvedRequest }]; result: HttpResult };
  'http:cancel': { args: [payload: { requestId: string }]; result: void };
  'response:save': { args: [payload: { suggestedName: string; bytesBase64: string }]; result: boolean };
  /** Manual "Buscar ahora" from Preferences; the outcome arrives as a toast. */
  'update:check': { args: []; result: void };
  /** "Reiniciar ahora" on the update-ready toast: close normally (saving), then install. */
  'update:install': { args: []; result: void };
}

/** Renderer → main, fire and forget (ipcRenderer.send / ipcMain.on). */
export interface SendChannels {
  'profile:sync': Profile;
  /** First render with the loaded profile is on screen: main may show the window. */
  'app:rendered': null;
}

/** Main → renderer events (webContents.send / ipcRenderer.on). */
export interface EventChannels {
  'settings:changed': AppSettings;
  'app:before-close': null;
  'app:toast': ToastMessage;
  'menu:command': MenuCommand;
  /** A .fcprofile was double-clicked while the app was running. */
  'app:open-path': string;
}

export type InvokeChannel = keyof InvokeChannels;
export type SendChannel = keyof SendChannels;
export type EventChannel = keyof EventChannels;

export const INVOKE_CHANNELS = [
  'app:init',
  'profile:save',
  'file:new',
  'file:open',
  'file:relocate',
  'file:reveal',
  'file:remove-recent',
  'file:pick-attachment',
  'settings:get',
  'settings:update',
  'app:zoom',
  'app:quit',
  'http:send',
  'http:cancel',
  'response:save',
  'update:check',
  'update:install',
] as const satisfies readonly InvokeChannel[];

export const SEND_CHANNELS = ['profile:sync', 'app:rendered'] as const satisfies readonly SendChannel[];

export const EVENT_CHANNELS = [
  'settings:changed',
  'app:before-close',
  'app:toast',
  'menu:command',
  'app:open-path',
] as const satisfies readonly EventChannel[];

/** API exposed by the preload as `window.api`. */
export interface FastClientApi {
  invoke<C extends InvokeChannel>(
    channel: C,
    ...args: InvokeChannels[C]['args']
  ): Promise<InvokeChannels[C]['result']>;
  send<C extends SendChannel>(channel: C, payload: SendChannels[C]): void;
  on<C extends EventChannel>(channel: C, listener: (payload: EventChannels[C]) => void): () => void;
}
