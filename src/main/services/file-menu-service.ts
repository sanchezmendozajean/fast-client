import { copyFile, readFile, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { newProfile, PROFILE_EXTENSION } from '../../shared/defaults';
import type {
  FileOpResult,
  NewRequestArgs,
  OpenRequestArgs,
  Profile,
  ProfileSession,
  RecentEntry,
  SaveReason,
  ToastMessage,
} from '../../shared/types';
import { atomicWrite } from './atomic-write';
import type { PathsService } from './paths-service';
import { fileExists, readProfile, serializeProfile, type ProfileService } from './profile-service';
import type { SettingsService } from './settings-service';

export interface FileDialogs {
  showSave(opts: { defaultPath: string }): Promise<string | null>;
  showOpen(opts: { defaultPath: string }): Promise<string | null>;
}

export interface ShellLike {
  showItemInFolder(path: string): void;
  openPath(path: string): Promise<string>;
}

export interface FileMenuDeps {
  paths: PathsService;
  settings: SettingsService;
  profiles: ProfileService;
  dialogs: FileDialogs;
  shell: ShellLike;
  toast: (t: ToastMessage) => void;
}

const samePath = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function profileNameFromPath(path: string): string {
  return basename(path, extname(path));
}

export function withProfileExtension(path: string): string {
  return extname(path) === '' ? `${path}${PROFILE_EXTENSION}` : path;
}

function dateStamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Move a file; across drives (EXDEV) copy + verify + delete (doc 04 §8). */
export async function moveFile(src: string, dest: string): Promise<void> {
  try {
    await rename(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') throw err;
    await copyFile(src, dest);
    const [a, b] = await Promise.all([readFile(src), readFile(dest)]);
    if (!a.equals(b)) {
      await unlink(dest).catch(() => undefined);
      throw new Error('La copia no coincide con el original', { cause: err });
    }
    await unlink(src);
  }
}

export class FileMenuService {
  constructor(private readonly d: FileMenuDeps) {}

  async recents(): Promise<RecentEntry[]> {
    const list = this.d.settings.get().recentProfiles;
    return Promise.all(list.map(async (path) => ({ path, exists: await fileExists(path) })));
  }

  /** Save the current profile before switching (moment #5). */
  private async saveCurrent(profile: Profile | null, reason: SaveReason): Promise<string | null> {
    if (!profile || !this.d.profiles.getPath()) return null;
    const r = await this.d.profiles.save(profile, reason);
    return r.ok ? null : r.message;
  }

  private async activate(path: string, profile: Profile, replaceRecent?: string): Promise<ProfileSession> {
    this.d.profiles.setSession(path, profile);
    await this.d.settings.setLastProfile(path, replaceRecent);
    return { profile, profilePath: path };
  }

  /** "Crear perfil vacío" (doc 04 §5 step 3). */
  async createEmptyDefault(): Promise<ProfileSession> {
    const path = this.d.paths.defaultProfilePath();
    const profile = newProfile(profileNameFromPath(path));
    await atomicWrite(path, serializeProfile(profile, profile.updatedAt));
    return this.activate(path, profile);
  }

  async newProfile(args: NewRequestArgs): Promise<FileOpResult> {
    if (args.mode === 'menu' && !args.skipSave && !args.resolution) {
      const err = await this.saveCurrent(args.profile, 'before-new');
      if (err) return { status: 'save-failed', message: err };
    }
    const defaultPath = this.d.paths.defaultProfilePath();
    const toasts: ToastMessage[] = [];

    try {
      if (await fileExists(defaultPath)) {
        switch (args.resolution) {
          case undefined:
            return { status: 'conflict', existingPath: defaultPath };
          case 'relocate-existing': {
            const picked = await this.d.dialogs.showSave({
              defaultPath: join(this.d.paths.getProfilesDir(), `perfil-${dateStamp()}${PROFILE_EXTENSION}`),
            });
            if (!picked) return { status: 'conflict', existingPath: defaultPath };
            const dest = withProfileExtension(picked);
            if (samePath(dest, defaultPath)) return { status: 'conflict', existingPath: defaultPath };
            await moveFile(defaultPath, dest);
            await this.d.settings.addRecent(dest, defaultPath);
            toasts.push({ kind: 'info', text: `El perfil anterior se movió a ${dest}` });
            break;
          }
          case 'create-anyway':
            await copyFile(defaultPath, `${defaultPath}.bak`);
            toasts.push({ kind: 'info', text: 'Se guardó una copia de respaldo en perfil.fcprofile.bak' });
            break;
          case 'open-existing': {
            const read = await readProfile(defaultPath);
            if (!read.ok) {
              return { status: 'error', toasts: [{ kind: 'error', text: readErrorText(read.reason, defaultPath) }] };
            }
            const session = await this.activate(defaultPath, read.profile);
            return { status: 'ok', session, recents: await this.recents(), toasts: [] };
          }
        }
      }
      const session = await this.createEmptyDefault();
      toasts.push({ kind: 'success', text: 'Nuevo perfil creado' });
      return { status: 'ok', session, recents: await this.recents(), toasts };
    } catch (err) {
      return {
        status: 'error',
        toasts: [{ kind: 'error', text: `No se pudo crear el perfil: ${(err as Error).message}` }],
      };
    }
  }

  async open(args: OpenRequestArgs): Promise<FileOpResult> {
    if (!args.skipSave) {
      const err = await this.saveCurrent(args.profile, 'before-open');
      if (err) return { status: 'save-failed', message: err };
    }
    const current = this.d.profiles.getPath();
    let path = args.path ?? null;
    if (!path) {
      path = await this.d.dialogs.showOpen({
        defaultPath: current ? dirname(current) : this.d.paths.getProfilesDir(),
      });
      if (!path) return { status: 'cancelled', toasts: [] };
    }
    if (current && samePath(path, current)) {
      return { status: 'cancelled', toasts: [{ kind: 'info', text: 'Ese perfil ya está abierto' }] };
    }
    const read = await readProfile(path);
    if (!read.ok) {
      return { status: 'error', toasts: [{ kind: 'error', text: readErrorText(read.reason, path) }] };
    }
    const session = await this.activate(path, read.profile);
    return {
      status: 'ok',
      session,
      recents: await this.recents(),
      toasts: [{ kind: 'success', text: `Perfil «${read.profile.name}» abierto` }],
    };
  }

  async relocate(profile: Profile): Promise<FileOpResult> {
    const current = this.d.profiles.getPath();
    if (!current) return { status: 'cancelled', toasts: [] };
    const picked = await this.d.dialogs.showSave({ defaultPath: current });
    if (!picked) return { status: 'cancelled', toasts: [] };
    const dest = withProfileExtension(picked);
    if (samePath(dest, current)) return { status: 'cancelled', toasts: [] };

    const renamed: Profile = { ...profile, name: profileNameFromPath(dest) };
    try {
      await atomicWrite(dest, serializeProfile(renamed));
      const check = await readProfile(dest);
      if (!check.ok) throw new Error('El archivo escrito no se pudo verificar');
    } catch (err) {
      return {
        status: 'error',
        toasts: [{ kind: 'error', text: `No se pudo reubicar el perfil: ${(err as Error).message}` }],
      };
    }
    const toasts: ToastMessage[] = [];
    try {
      await unlink(current);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        toasts.push({ kind: 'warning', text: `Se guardó en ${dest}, pero no se pudo eliminar el original` });
      }
    }
    const session = await this.activate(dest, renamed, current);
    toasts.push({
      kind: 'success',
      text: `Perfil reubicado en ${dest}`,
      action: { label: 'Ir al archivo', command: 'reveal' },
    });
    return { status: 'ok', session, recents: await this.recents(), toasts };
  }

  /** Doc 04 §9. */
  async reveal(): Promise<boolean> {
    const path = this.d.profiles.getPath();
    if (!path) return false;
    if (await fileExists(path)) {
      this.d.shell.showItemInFolder(path);
      return true;
    }
    const dir = dirname(path);
    const dirOk = await stat(dir)
      .then((s) => s.isDirectory())
      .catch(() => false);
    if (dirOk) {
      await this.d.shell.openPath(dir);
      this.d.toast({ kind: 'info', text: 'El archivo aún no existe en disco; se abrió su carpeta' });
      return true;
    }
    this.d.toast({
      kind: 'error',
      text: 'No se encontró la carpeta del perfil',
      action: { label: 'Reubicar…', command: 'relocate' },
    });
    return false;
  }
}

export function readErrorText(reason: 'missing' | 'invalid' | 'future-version' | 'unreadable', path: string): string {
  switch (reason) {
    case 'missing':
      return `No se encontró el archivo ${path}`;
    case 'future-version':
      return 'Este perfil fue creado con una versión más reciente de Fast Client';
    case 'unreadable':
    case 'invalid':
      return 'El archivo no es un perfil válido de Fast Client';
  }
}
