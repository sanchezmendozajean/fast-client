import { readFile, rename } from 'node:fs/promises';
import { defaultSettings } from '../../shared/defaults';
import { clampSettings, parseSettings, pushRecent } from '../../shared/settings-schema';
import type { AppSettings } from '../../shared/types';
import { atomicWrite, atomicWriteSync } from './atomic-write';

export class SettingsService {
  private settings: AppSettings = defaultSettings();

  constructor(private readonly file: string) {}

  /** Missing → defaults; corrupt → renamed to `.corrupt` and defaults (doc 04 §10). */
  async load(): Promise<AppSettings> {
    let text: string;
    try {
      text = await readFile(this.file, 'utf8');
    } catch {
      this.settings = defaultSettings();
      return this.get();
    }
    try {
      this.settings = parseSettings(JSON.parse(text));
    } catch {
      await rename(this.file, `${this.file}.corrupt`).catch(() => undefined);
      this.settings = defaultSettings();
    }
    return this.get();
  }

  get(): AppSettings {
    return structuredClone(this.settings);
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = this.merge(patch);
    await this.save();
    return this.get();
  }

  /** Update in memory only (e.g. window bounds while moving); persisted by the next save. */
  patchInMemory(patch: Partial<AppSettings>): void {
    this.settings = this.merge(patch);
  }

  async setLastProfile(path: string, replace?: string): Promise<void> {
    await this.update({
      lastProfilePath: path,
      recentProfiles: pushRecent(this.settings.recentProfiles, path, replace),
    });
  }

  async addRecent(path: string, replace?: string): Promise<void> {
    await this.update({ recentProfiles: pushRecent(this.settings.recentProfiles, path, replace) });
  }

  async removeRecent(path: string): Promise<void> {
    const norm = path.toLowerCase();
    await this.update({ recentProfiles: this.settings.recentProfiles.filter((p) => p.toLowerCase() !== norm) });
  }

  async save(): Promise<void> {
    await atomicWrite(this.file, JSON.stringify(this.settings, null, 2));
  }

  saveSync(): void {
    atomicWriteSync(this.file, JSON.stringify(this.settings, null, 2));
  }

  private merge(patch: Partial<AppSettings>): AppSettings {
    return clampSettings({
      ...this.settings,
      ...patch,
      settingsVersion: 1,
      http: { ...this.settings.http, ...patch.http },
      window: { ...this.settings.window, ...patch.window },
    });
  }
}
