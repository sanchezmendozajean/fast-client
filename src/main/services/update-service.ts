import type { ToastMessage, UpdatePhase } from '../../shared/types';

/** The slice of electron-updater's `autoUpdater` this service uses (injected so it can be tested). */
export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean; updateInfo: { version: string } } | null>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: 'update-downloaded', listener: (info: { version: string }) => void): unknown;
  on(event: 'error', listener: (err: Error) => void): unknown;
}

export interface UpdateServiceDeps {
  updater: UpdaterLike;
  /** False in dev and e2e runs: there is no installed app to update. */
  enabled: boolean;
  currentVersion: string;
  toast: (t: ToastMessage) => void;
  /** Phase changes, for the Preferences button (spinner while checking/downloading). */
  onPhase: (phase: UpdatePhase) => void;
}

/**
 * Update checks against GitHub Releases (doc decisiones, 2026-09-29).
 * The only network traffic besides the user's own requests. Automatic checks are silent unless
 * an update is ready; manual checks ("Buscar ahora") always report the outcome.
 */
export class UpdateService {
  private downloadedVersion: string | null = null;
  private checking = false;
  private phase: UpdatePhase = 'idle';

  constructor(private readonly deps: UpdateServiceDeps) {
    const u = deps.updater;
    u.autoDownload = true;
    u.autoInstallOnAppQuit = true;
    u.on('update-downloaded', (info) => {
      this.downloadedVersion = info.version;
      this.setPhase('ready');
      deps.toast(this.readyToast(info.version));
    });
    // Download errors are also emitted here; without a listener they would be unhandled.
    u.on('error', () => {
      if (!this.downloadedVersion) this.setPhase('idle');
    });
  }

  get isUpdateReady(): boolean {
    return this.downloadedVersion !== null;
  }

  async check(manual: boolean): Promise<void> {
    const { updater, enabled, currentVersion, toast } = this.deps;
    if (!enabled) {
      if (manual) toast({ kind: 'info', text: 'Las actualizaciones solo funcionan en la versión instalada' });
      return;
    }
    if (this.downloadedVersion) {
      if (manual) toast(this.readyToast(this.downloadedVersion));
      return;
    }
    if (this.checking) return;
    this.checking = true;
    this.setPhase('checking');
    try {
      const r = await updater.checkForUpdates();
      // The download keeps going after the check resolves; 'update-downloaded' moves it to ready.
      this.setPhase(r?.isUpdateAvailable && !this.downloadedVersion ? 'downloading' : this.phase === 'ready' ? 'ready' : 'idle');
      if (!manual) return;
      if (r?.isUpdateAvailable) {
        toast({ kind: 'info', text: `Descargando Fast Client ${r.updateInfo.version}…` });
      } else {
        toast({ kind: 'success', text: `Ya tienes la última versión (${currentVersion})` });
      }
    } catch {
      this.setPhase('idle');
      if (manual) toast({ kind: 'error', text: 'No se pudo buscar actualizaciones. Revisa tu conexión.' });
    } finally {
      this.checking = false;
    }
  }

  /** Called after the profile was saved on close: install silently and reopen the app. */
  installAndRestart(): void {
    this.deps.updater.quitAndInstall(true, true);
  }

  private setPhase(phase: UpdatePhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.deps.onPhase(phase);
  }

  private readyToast(version: string): ToastMessage {
    return {
      kind: 'success',
      text: `Fast Client ${version} está listo. Se instalará al cerrar.`,
      action: { label: 'Reiniciar ahora', command: 'install-update' },
    };
  }
}
