export type PlatformId =
  | 'line'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'custom';

export type OutputFormat = 'jpeg' | 'png' | 'webp';

export type PresetGroup = 'Card-based' | 'Rich Message' | 'Coupon' | string;

export type PreviewTemplateType =
  | 'product'
  | 'image'
  | 'person'
  | 'rich'
  | 'coupon'
  | 'fb-post'
  | 'fb-cover'
  | 'ig-post'
  | 'ig-story'
  | 'yt-thumb'
  | 'yt-banner'
  | 'tt-video'
  | 'tt-profile'
  | 'x-post'
  | 'x-header'
  | 'custom';

export interface LinePreset {
  id: string;
  platform: PlatformId;
  group: PresetGroup;
  name: string;
  shortName: string;
  ratioLabel: string;
  width: number;
  height: number;
  maxSizeMb: number;
  recommendedMaxKb: number;
  filenameSuffix: string;
  previewTemplate: PreviewTemplateType;
  usageNote: string;
}

export type FitMode = 'crop' | 'pad';

export type PadBackdrop = 'blur' | 'white' | 'edge' | 'custom' | 'transparent';

export type MatteMode = 'white' | 'edge' | 'black' | 'custom';

export type ResolutionScale = 1 | 2;

export interface FramingState {
  fitMode: FitMode;
  offsetX: number; // -1 to 1 normalized pan offset within available overflow
  offsetY: number; // -1 to 1 normalized pan offset within available overflow
  zoom: number; // 1.0 to 3.0
  padBackdrop: PadBackdrop;
  padColor: string;
  blurRadius: number; // 8 to 48
  padInset: number; // 0 to 18 (%)
  outputFormat: OutputFormat;
  preserveTransparency: boolean;
  matteMode: MatteMode;
  matteColor: string;
  autoOptimize: boolean;
  autoDetectFormat: boolean;
  quality: number; // 0.01 to 1.00 (1-100)
  scale: ResolutionScale;
  sharpen: boolean;
  showGrid: boolean;
  customWidth: number;
  customHeight: number;
  lockCustomAspect: boolean;
}

export interface SourceAsset {
  image: HTMLImageElement;
  objectUrl: string;
  fileName: string;
  mimeType: string;
  formatLabel: string;
  originalBytes: number;
  naturalWidth: number;
  naturalHeight: number;
  edgeColor: string;
  hasTransparency: boolean;
  transparencyPercent: number;
  isSample?: boolean;
}

export interface EncodedOutput {
  blob: Blob | null;
  objectUrl: string | null;
  bytes: number;
  width: number;
  height: number;
  format: OutputFormat;
  mimeType: string;
  encoding: boolean;
  encodeTimeMs: number;
  optimizedQuality?: number;
  matteApplied: boolean;
  alphaPreserved: boolean;
}

export interface PreviewCopy {
  accountName: string;
  title: string;
  description: string;
  price: string;
  tag: string;
  ctaLabel: string;
  couponValidity: string;
}

export interface SampleAsset {
  id: string;
  title: string;
  category: string;
  aspectHint: string;
  src: string;
  webpFileName: string;
  defaultPresetId: string;
  defaultCopy: PreviewCopy;
}

export interface BatchItem {
  id: string;
  asset: SourceAsset;
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface ZipExportState {
  exporting: boolean;
  completed: number;
  total: number;
}

export type ActiveView = 'converter' | 'guide' | 'tips';

export type MobileTab = 'presets' | 'fit' | 'quality' | 'preview';
