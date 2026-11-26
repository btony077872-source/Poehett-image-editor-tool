export type PlatformId =
  | 'line'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'x'
  | 'custom';

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif';

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

export type BgRemovalMode =
  | 'auto-edge'
  | 'gradient-checker'
  | 'luma-light'
  | 'luma-dark'
  | 'chroma-key';

export interface BgRemovalConfig {
  enabled: boolean;
  mode: BgRemovalMode;
  tolerance: number; // 5 to 100
  smoothness: number; // 0 to 10
  edgeTrim: number; // 0 to 3 px
  removeInteriorHoles: boolean;
  defringe: boolean;
  targetColor: string;
}

export type WatermarkAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'tile';

export type LogoGifMotion =
  | 'none'
  | 'pulse'
  | 'float'
  | 'wiggle'
  | 'spin'
  | 'orbit'
  | 'shimmer'
  | 'gif-frames';

export type LogoGifSpeed = 'slow' | 'normal' | 'fast';

export interface LogoGifFrame {
  canvas: HTMLCanvasElement;
  delayMs: number;
}

export interface LogoWatermarkAsset {
  image: HTMLImageElement;
  objectUrl: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  edgeColor: string;
  isAnimatedGif?: boolean;
  gifFrames?: LogoGifFrame[];
}

export interface LogoWatermarkState {
  enabled: boolean;
  sizePercent: number; // 6 to 65
  opacity: number; // 0.1 to 1
  position: WatermarkAnchor;
  marginPercent: number; // 0 to 15
  rotation: number; // -45 to 45
  bgRemoval: BgRemovalConfig;
  gifMotion: LogoGifMotion;
  gifSpeed: LogoGifSpeed;
  gifFps: number; // 6 to 20
}

export type TextFontStyle = 'display' | 'sans' | 'mono' | 'serif';

export interface TextWatermarkState {
  enabled: boolean;
  text: string;
  fontStyle: TextFontStyle;
  bold: boolean;
  italic: boolean;
  sizePercent: number; // 2 to 16
  color: string;
  opacity: number; // 0.1 to 1
  position: WatermarkAnchor;
  marginPercent: number; // 0 to 15
  rotation: number; // -45 to 45
  strokeEnabled: boolean;
  strokeColor: string;
  shadowEnabled: boolean;
  badgeEnabled: boolean;
  badgeColor: string;
  badgeOpacity: number; // 0.15 to 1
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SubjectDetectionMethod =
  | 'face-api'
  | 'portrait-heuristic'
  | 'focal-contrast'
  | 'centered';

export type AspectOrientation = 'portrait' | 'square' | 'landscape';

export interface AutoCropAnalysis {
  trimBounds: NormalizedRect;
  trimmedPercent: number;
  subjectCenter: { x: number; y: number }; // 0..1 within trimmedBounds
  targetAnchor: { x: number; y: number }; // {0.5, 0.38} for portrait headroom, {0.5, 0.5} standard
  detectionMethod: SubjectDetectionMethod;
  isPortraitSubject: boolean;
  faceCount: number;
  initialOffsetX: number;
  initialOffsetY: number;
  hasTrimmedMargins: boolean;
}

export interface AspectPresetCandidate {
  preset: LinePreset;
  platformLabel: string;
  distance: number;
  isExactMatch: boolean;
}

export interface AspectPresetMatch {
  preset: LinePreset;
  platformLabel: string;
  sourceRatioLabel: string;
  sourceAspectRatio: number;
  orientation: AspectOrientation;
  distance: number;
  isExactMatch: boolean;
  alternatives: AspectPresetCandidate[];
}

export interface FramingState {
  fitMode: FitMode;
  autoCropEnabled: boolean;
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
  bgRemoval: BgRemovalConfig;
  logoWatermark: LogoWatermarkState;
  textWatermark: TextWatermarkState;
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
  autoCrop?: AutoCropAnalysis;
  aspectMatch?: AspectPresetMatch;
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

export type MobileTab = 'presets' | 'fit' | 'layers' | 'quality' | 'preview';
