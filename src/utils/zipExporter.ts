import JSZip from 'jszip';
import { BatchItem, FramingState, LinePreset, LogoWatermarkAsset, OutputFormat } from '../types';
import {
  buildOutputFilename,
  encodeImageOutput,
  getFormatExtension,
} from './imageEngine';

function ensureUniqueFilename(baseFileName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseFileName)) {
    usedNames.add(baseFileName);
    return baseFileName;
  }

  const dotIdx = baseFileName.lastIndexOf('.');
  const stem = dotIdx > 0 ? baseFileName.slice(0, dotIdx) : baseFileName;
  const ext = dotIdx > 0 ? baseFileName.slice(dotIdx) : '';

  let counter = 2;
  let candidate = `${stem}-${counter}${ext}`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${stem}-${counter}${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

export interface ZipBuildResult {
  blob: Blob;
  archiveName: string;
  count: number;
  totalImageBytes: number;
}

export function sanitizeBatchPrefix(rawPrefix: string): string {
  return rawPrefix
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildBatchExportFilename(
  originalName: string,
  preset: LinePreset,
  customPrefix: string,
  index: number,
  total: number,
  outputFormat: OutputFormat = 'jpeg'
): string {
  const safePrefix = sanitizeBatchPrefix(customPrefix);
  const ext = getFormatExtension(outputFormat);
  if (!safePrefix) {
    return buildOutputFilename(originalName, preset, outputFormat);
  }
  const padWidth = total >= 100 ? 3 : 2;
  const seq = String(index + 1).padStart(padWidth, '0');
  return `${safePrefix}-${seq}.${ext}`;
}

export async function buildBatchZipArchive(
  items: BatchItem[],
  preset: LinePreset,
  sharedFraming: FramingState,
  onProgress?: (completed: number, total: number) => void,
  customPrefix = '',
  logoAsset?: LogoWatermarkAsset | null
): Promise<ZipBuildResult> {
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const total = items.length;
  let totalImageBytes = 0;

  onProgress?.(0, total);

  for (let index = 0; index < total; index += 1) {
    const item = items[index];
    const itemFraming: FramingState = {
      ...sharedFraming,
      offsetX: item.offsetX,
      offsetY: item.offsetY,
      zoom: item.zoom,
    };

    const { blob } = await encodeImageOutput(item.asset, preset, itemFraming, logoAsset);
    totalImageBytes += blob.size;

    const rawName = buildBatchExportFilename(
      item.asset.fileName,
      preset,
      customPrefix,
      index,
      total,
      sharedFraming.outputFormat
    );
    const uniqueName = ensureUniqueFilename(rawName, usedNames);
    zip.file(uniqueName, blob);

    onProgress?.(index + 1, total);
  }

  // Encoded images are already compressed, so STORE gives instant packaging
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE',
  });

  const safePrefix = sanitizeBatchPrefix(customPrefix);
  const extTag = getFormatExtension(sharedFraming.outputFormat);
  const qualityInt = Math.max(
    1,
    Math.min(100, Math.round(sharedFraming.quality * 100))
  );
  const archiveName = safePrefix
    ? `${safePrefix}_${total}-images.zip`
    : sharedFraming.outputFormat === 'png' || sharedFraming.outputFormat === 'gif'
    ? `${preset.filenameSuffix}_${extTag}_${total}-images.zip`
    : `${preset.filenameSuffix}_${extTag}-q${qualityInt}_${total}-images.zip`;

  return {
    blob: zipBlob,
    archiveName,
    count: total,
    totalImageBytes,
  };
}
