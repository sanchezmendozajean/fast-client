import type { InitResult, ProfileSession, ToastMessage } from '../../shared/types';
import type { FileMenuService } from './file-menu-service';
import type { PathsService } from './paths-service';
import { fileExists, readProfile, type ProfileService } from './profile-service';
import type { SettingsService } from './settings-service';
import { basename } from 'node:path';

export interface StartupDeps {
  paths: PathsService;
  settings: SettingsService;
  profiles: ProfileService;
  files: FileMenuService;
}

/** Doc 04 §4. Never shows a file dialog: a conflict is returned for the renderer to ask. */
export async function runStartup(d: StartupDeps, openPath?: string): Promise<Omit<InitResult, 'appVersion'>> {
  const toasts: ToastMessage[] = [];
  if (d.paths.fallbackUsed) {
    toasts.push({
      kind: 'warning',
      text: `No se pudo usar la carpeta Documentos. Tus perfiles se guardarán en ${d.paths.getProfilesDir()}`,
    });
  }
  const settings = d.settings.get();
  let session: ProfileSession | null = null;
  let startupConflictPath: string | null = null;

  const activate = async (path: string): Promise<boolean> => {
    const read = await readProfile(path);
    if (!read.ok) return false;
    d.profiles.setSession(path, read.profile);
    await d.settings.setLastProfile(path);
    session = { profile: read.profile, profilePath: path };
    return true;
  };

  const runNewFlow = async (): Promise<void> => {
    if (await fileExists(d.paths.defaultProfilePath())) {
      startupConflictPath = d.paths.defaultProfilePath();
    } else {
      session = await d.files.createEmptyDefault();
    }
  };

  // A .fcprofile passed on the command line (file association) wins over the last profile.
  const target = openPath ?? settings.lastProfilePath;

  if (target === null) {
    const def = d.paths.defaultProfilePath();
    if (!(await fileExists(def))) {
      session = await d.files.createEmptyDefault();
    } else if (!(await activate(def))) {
      toasts.push({
        kind: 'warning',
        text: `No se pudo leer el perfil «${basename(def)}» en ${def} (formato inválido). Se inició un perfil nuevo.`,
      });
      startupConflictPath = def;
    }
  } else if (!(await activate(target))) {
    const exists = await fileExists(target);
    toasts.push({
      kind: 'warning',
      text: exists
        ? `No se pudo leer el perfil «${basename(target)}» en ${target} (formato inválido). Se inició un perfil nuevo.`
        : `No se encontró el perfil «${basename(target)}» en ${target}. Se inició un perfil nuevo.`,
    });
    await runNewFlow();
  }

  return {
    session,
    startupConflictPath,
    settings: d.settings.get(),
    recents: await d.files.recents(),
    profilesDir: d.paths.getProfilesDir(),
    toasts,
  };
}
