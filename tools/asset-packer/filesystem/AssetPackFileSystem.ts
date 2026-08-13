import {
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';

export interface AssetPackFileStat {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface AssetPackDirectoryEntry extends AssetPackFileStat {
  readonly name: string;
}

export interface AssetPackFileSystem {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: string | Uint8Array): Promise<void>;
  mkdir(
    path: string,
    options?: { readonly recursive?: boolean },
  ): Promise<void>;
  rm(
    path: string,
    options: { readonly recursive: boolean; readonly force: boolean },
  ): Promise<void>;
  rename(source: string, destination: string): Promise<void>;
  realpath(path: string): Promise<string>;
  stat(path: string): Promise<AssetPackFileStat>;
  lstat(path: string): Promise<AssetPackFileStat>;
  readdir(path: string): Promise<readonly AssetPackDirectoryEntry[]>;
}

export const nodeAssetPackFileSystem: AssetPackFileSystem = {
  readFile,
  async writeFile(path, data) {
    await writeFile(path, data);
  },
  async mkdir(path, options) {
    await mkdir(path, options);
  },
  async rm(path, options) {
    await rm(path, options);
  },
  async rename(source, destination) {
    await rename(source, destination);
  },
  realpath,
  stat,
  lstat,
  async readdir(path) {
    return readdir(path, { withFileTypes: true });
  },
};
