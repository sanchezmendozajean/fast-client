import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  SEND_CHANNELS,
  type EventChannel,
  type FastClientApi,
  type InvokeChannel,
  type SendChannel,
} from '../shared/ipc';

const invokeAllowed = new Set<string>(INVOKE_CHANNELS);
const sendAllowed = new Set<string>(SEND_CHANNELS);
const eventAllowed = new Set<string>(EVENT_CHANNELS);

// Only whitelisted channels; ipcRenderer itself is never exposed.
const api: FastClientApi = {
  invoke: (channel: InvokeChannel, ...args: unknown[]) => {
    if (!invokeAllowed.has(channel)) return Promise.reject(new Error(`Canal no permitido: ${channel}`));
    return ipcRenderer.invoke(channel, ...args);
  },
  send: (channel: SendChannel, payload: unknown) => {
    if (sendAllowed.has(channel)) ipcRenderer.send(channel, payload);
  },
  on: (channel: EventChannel, listener: (payload: unknown) => void) => {
    if (!eventAllowed.has(channel)) return () => undefined;
    const wrapped = (_e: IpcRendererEvent, payload: unknown): void => listener(payload);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
} as FastClientApi;

contextBridge.exposeInMainWorld('api', api);
