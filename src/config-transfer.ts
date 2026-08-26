import { type FileHandle, open, stat, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { type ConfigFormValue, requireConfig } from "./configuration";

const CONFIG_FILE_FORMAT = "attend-kingoftime.config";
const CONFIG_FILE_VERSION = 1;
const MAX_CONFIG_FILE_SIZE_BYTES = 1024 * 1024;

interface ConfigFileValue {
  format: typeof CONFIG_FILE_FORMAT;
  version: typeof CONFIG_FILE_VERSION;
  config: ConfigFormValue;
}

const configTransferError = (message: string) => new Error(message);

const getFileSystemErrorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;

const throwImportFileSystemError = (error: unknown): never => {
  const code = getFileSystemErrorCode(error);
  if (!code) throw error;

  if (code === "ENOENT") throw configTransferError("選択した設定JSONが見つかりません。");
  if (code === "EACCES" || code === "EPERM") {
    throw configTransferError("選択した設定JSONを読み込む権限がありません。");
  }
  throw configTransferError("設定JSONを読み込めませんでした。もう一度お試しください。");
};

const throwExportFileSystemError = (error: unknown): never => {
  const code = getFileSystemErrorCode(error);
  if (!code) throw error;

  if (code === "EEXIST") {
    throw configTransferError("同じ名前の設定JSONが既にあります。少し待ってから、もう一度お試しください。");
  }
  if (code === "EACCES" || code === "EPERM") {
    throw configTransferError("選択したフォルダへ書き込む権限がありません。");
  }
  if (code === "ENOSPC") throw configTransferError("保存先の空き容量が不足しています。");
  if (code === "ENOENT" || code === "ENOTDIR") {
    throw configTransferError("選択した保存先フォルダが見つかりません。");
  }
  throw configTransferError("設定JSONを書き出せませんでした。もう一度お試しください。");
};

export const serializeConfig = (values: unknown) => {
  const config = requireConfig(values);
  const fileValue: ConfigFileValue = {
    format: CONFIG_FILE_FORMAT,
    version: CONFIG_FILE_VERSION,
    config,
  };
  return `${JSON.stringify(fileValue, null, 2)}\n`;
};

export const parseConfig = (json: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.replace(/^\uFEFF/u, ""));
  } catch {
    throw configTransferError("JSONの形式が正しくありません。");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw configTransferError("設定JSONの内容が正しくありません。");
  }

  const fileValue = parsed as Partial<ConfigFileValue>;
  if (fileValue.format !== CONFIG_FILE_FORMAT) {
    throw configTransferError("Attend Kingoftimeから出力された設定JSONではありません。");
  }
  if (fileValue.version !== CONFIG_FILE_VERSION) {
    throw configTransferError("対応していない設定JSONのバージョンです。");
  }

  return requireConfig(fileValue.config);
};

export const importConfigFile = async (filePath: string): Promise<ConfigFormValue> => {
  if (extname(filePath).toLowerCase() !== ".json") {
    throw configTransferError("拡張子が.jsonのファイルを選択してください。");
  }

  let file: FileHandle | undefined;
  try {
    file = await open(filePath, "r");
    const fileInfo = await file.stat();
    if (!fileInfo.isFile()) throw configTransferError("設定JSONファイルを選択してください。");
    if (fileInfo.size > MAX_CONFIG_FILE_SIZE_BYTES) {
      throw configTransferError("設定JSONのサイズが1MBを超えています。");
    }

    const buffer = Buffer.alloc(MAX_CONFIG_FILE_SIZE_BYTES + 1);
    let totalBytesRead = 0;
    while (totalBytesRead < buffer.byteLength) {
      const { bytesRead } = await file.read(buffer, totalBytesRead, buffer.byteLength - totalBytesRead, totalBytesRead);
      if (bytesRead === 0) break;
      totalBytesRead += bytesRead;
    }

    if (totalBytesRead > MAX_CONFIG_FILE_SIZE_BYTES) {
      throw configTransferError("設定JSONのサイズが1MBを超えています。");
    }

    return parseConfig(buffer.toString("utf8", 0, totalBytesRead));
  } catch (error) {
    return throwImportFileSystemError(error);
  } finally {
    await file?.close().catch(() => undefined);
  }
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

export const getConfigFileName = (date = new Date()) =>
  [
    "attend-kingoftime-config-",
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
    "-",
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds()),
    ".json",
  ].join("");

export const exportConfigFile = async (directoryPath: string, values: unknown, date = new Date()): Promise<string> => {
  const json = serializeConfig(values);
  let file: FileHandle | undefined;
  let filePath: string | undefined;
  let writeCompleted = false;

  try {
    const directoryInfo = await stat(directoryPath);
    if (!directoryInfo.isDirectory()) throw configTransferError("保存先フォルダを選択してください。");

    filePath = join(directoryPath, getConfigFileName(date));
    file = await open(filePath, "wx", 0o600);
    await file.writeFile(json, "utf8");
    await file.sync();
    writeCompleted = true;
    return filePath;
  } catch (error) {
    return throwExportFileSystemError(error);
  } finally {
    await file?.close().catch(() => undefined);
    if (filePath && file && !writeCompleted) {
      await unlink(filePath).catch(() => undefined);
    }
  }
};
