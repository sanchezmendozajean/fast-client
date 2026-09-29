import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_PROFILE_FILE, SETTINGS_FILE } from '../../shared/defaults';

export interface PathsInput {
  isPackaged: boolean;
  appPath: string;
  documentsDir: string;
  userDataDir: string;
  env: Record<string, string | undefined>;
}

export interface ResolvedPaths {
  profilesDir: string;
  configDir: string;
}

/** Doc 04 §1: FASTCLIENT_HOME (tests) > .dev-data (dev) > Documents / userData (packaged). */
export function resolvePaths(input: PathsInput): ResolvedPaths {
  const home = input.env.FASTCLIENT_HOME;
  if (home) return { profilesDir: home, configDir: home };
  if (!input.isPackaged) {
    const dev = join(input.appPath, '.dev-data');
    return { profilesDir: dev, configDir: dev };
  }
  return { profilesDir: join(input.documentsDir, 'Fast Client'), configDir: input.userDataDir };
}

async function isWritableDir(dir: string): Promise<boolean> {
  try {
    await mkdir(dir, { recursive: true });
    await access(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export class PathsService {
  profilesDir: string;
  readonly configDir: string;
  /** Set when Documents could not be used and <config>/perfiles was used instead. */
  fallbackUsed = false;

  constructor(paths: ResolvedPaths) {
    this.profilesDir = paths.profilesDir;
    this.configDir = paths.configDir;
  }

  async ensure(): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    if (!(await isWritableDir(this.profilesDir))) {
      this.profilesDir = join(this.configDir, 'perfiles');
      await mkdir(this.profilesDir, { recursive: true });
      this.fallbackUsed = true;
    }
  }

  getProfilesDir(): string {
    return this.profilesDir;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  defaultProfilePath(): string {
    return join(this.profilesDir, DEFAULT_PROFILE_FILE);
  }

  settingsPath(): string {
    return join(this.configDir, SETTINGS_FILE);
  }
}
