import {
  FramingState,
  LinePreset,
  PlatformId,
  PreviewCopy,
  SampleAsset,
} from '../types';

export interface PlatformCategoryMeta {
  id: PlatformId;
  label: string;
  shortLabel: string;
  defaultPresetId: string;
}

export const PLATFORM_CATEGORIES: PlatformCategoryMeta[] = [
  { id: 'line', label: 'LINE OA', shortLabel: 'LINE', defaultPresetId: 'card-product' },
  { id: 'facebook', label: 'Facebook', shortLabel: 'Facebook', defaultPresetId: 'fb-portrait' },
  { id: 'instagram', label: 'Instagram', shortLabel: 'Instagram', defaultPresetId: 'ig-portrait' },
  { id: 'youtube', label: 'YouTube', shortLabel: 'YouTube', defaultPresetId: 'yt-thumb' },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TikTok', defaultPresetId: 'tt-vertical' },
  { id: 'x', label: 'X (Twitter)', shortLabel: 'X', defaultPresetId: 'x-landscape' },
  { id: 'custom', label: 'Custom Size', shortLabel: 'Custom', defaultPresetId: 'custom-size' },
];

export const LINE_PRESETS: LinePreset[] = [
  // LINE Official Account (preserved unchanged)
  {
    id: 'card-product',
    platform: 'line',
    group: 'Card-based',
    name: 'Product / Place Card',
    shortName: 'Product / Place',
    ratioLabel: '1.54:1',
    width: 1540,
    height: 1000,
    maxSizeMb: 10,
    recommendedMaxKb: 600,
    filenameSuffix: 'line-card-154',
    previewTemplate: 'product',
    usageNote:
      'Standard horizontal ratio for LINE Shop product carousels, store locations, and closing tail cards.',
  },
  {
    id: 'card-image',
    platform: 'line',
    group: 'Card-based',
    name: 'Image Card',
    shortName: 'Image Card',
    ratioLabel: '1.11:1',
    width: 1332,
    height: 1200,
    maxSizeMb: 10,
    recommendedMaxKb: 600,
    filenameSuffix: 'line-image-111',
    previewTemplate: 'image',
    usageNote:
      'Near-square visual card for lookbooks, seasonal highlights, and full-bleed campaign slides.',
  },
  {
    id: 'card-person',
    platform: 'line',
    group: 'Card-based',
    name: 'Person Card',
    shortName: 'Person Card',
    ratioLabel: '1:1',
    width: 1040,
    height: 1040,
    maxSizeMb: 10,
    recommendedMaxKb: 500,
    filenameSuffix: 'line-person-1x1',
    previewTemplate: 'person',
    usageNote:
      'Square portrait frame rendered inside a circular avatar crop on LINE staff and stylist cards.',
  },
  {
    id: 'rich-square',
    platform: 'line',
    group: 'Rich Message',
    name: 'Rich Message Square',
    shortName: 'Rich Square',
    ratioLabel: '1:1',
    width: 1040,
    height: 1040,
    maxSizeMb: 10,
    recommendedMaxKb: 800,
    filenameSuffix: 'line-rich-1040x1040',
    previewTemplate: 'rich',
    usageNote:
      'Full-width 1040px square promotional broadcast with tappable link or coupon area.',
  },
  {
    id: 'rich-compact',
    platform: 'line',
    group: 'Rich Message',
    name: 'Rich Message Compact',
    shortName: 'Rich Compact',
    ratioLabel: '2:1',
    width: 1040,
    height: 520,
    maxSizeMb: 10,
    recommendedMaxKb: 500,
    filenameSuffix: 'line-rich-1040x520',
    previewTemplate: 'rich',
    usageNote:
      'Wide 1040×520 banner format ideal for flash-sale headers and compact chat broadcasts.',
  },
  {
    id: 'coupon-square',
    platform: 'line',
    group: 'Coupon',
    name: 'LINE Coupon',
    shortName: 'Coupon 640px',
    ratioLabel: '1:1',
    width: 640,
    height: 640,
    maxSizeMb: 10,
    recommendedMaxKb: 350,
    filenameSuffix: 'line-coupon-640',
    previewTemplate: 'coupon',
    usageNote:
      'Official 640×640 square thumbnail for LINE OA discount vouchers and member rewards.',
  },

  // Facebook Presets
  {
    id: 'fb-portrait',
    platform: 'facebook',
    group: 'Feed & Promo',
    name: 'Facebook Portrait Post',
    shortName: 'Feed Portrait',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
    maxSizeMb: 30,
    recommendedMaxKb: 900,
    filenameSuffix: 'fb-post-4x5',
    previewTemplate: 'fb-post',
    usageNote:
      'High-engagement vertical 4:5 feed format maximizing mobile screen real estate in Facebook feeds.',
  },
  {
    id: 'fb-square',
    platform: 'facebook',
    group: 'Feed & Promo',
    name: 'Facebook Square Post',
    shortName: 'Feed Square',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    maxSizeMb: 30,
    recommendedMaxKb: 800,
    filenameSuffix: 'fb-post-1x1',
    previewTemplate: 'fb-post',
    usageNote:
      'Balanced 1080×1080 square image for Facebook posts, carousels, and Marketplace listings.',
  },
  {
    id: 'fb-link',
    platform: 'facebook',
    group: 'Feed & Promo',
    name: 'Facebook Link / Ad Banner',
    shortName: 'Link / Ad',
    ratioLabel: '1.91:1',
    width: 1200,
    height: 630,
    maxSizeMb: 30,
    recommendedMaxKb: 700,
    filenameSuffix: 'fb-link-1200x630',
    previewTemplate: 'fb-post',
    usageNote:
      'Recommended OpenGraph share and landscape link ad ratio for Facebook promotions.',
  },
  {
    id: 'fb-cover',
    platform: 'facebook',
    group: 'Page Header',
    name: 'Facebook Page Cover',
    shortName: 'Page Cover',
    ratioLabel: '2.7:1',
    width: 851,
    height: 315,
    maxSizeMb: 10,
    recommendedMaxKb: 500,
    filenameSuffix: 'fb-cover-851x315',
    previewTemplate: 'fb-cover',
    usageNote:
      'Official 851×315 Facebook Page banner. Keep main subjects centered for mobile cover crops.',
  },

  // Instagram Presets
  {
    id: 'ig-portrait',
    platform: 'instagram',
    group: 'Feed Posts',
    name: 'Instagram Portrait',
    shortName: 'Portrait 4:5',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
    maxSizeMb: 30,
    recommendedMaxKb: 900,
    filenameSuffix: 'ig-portrait-4x5',
    previewTemplate: 'ig-post',
    usageNote:
      'Tallest vertical feed post ratio on Instagram (1080×1350) for product showcase and lookbooks.',
  },
  {
    id: 'ig-square',
    platform: 'instagram',
    group: 'Feed Posts',
    name: 'Instagram Square',
    shortName: 'Square 1:1',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    maxSizeMb: 30,
    recommendedMaxKb: 800,
    filenameSuffix: 'ig-square-1x1',
    previewTemplate: 'ig-post',
    usageNote:
      'Classic 1080×1080 grid-ready square post with zero profile grid cropping.',
  },
  {
    id: 'ig-story',
    platform: 'instagram',
    group: 'Stories & Reels',
    name: 'Instagram Story / Reel Cover',
    shortName: 'Story / Reel',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    maxSizeMb: 30,
    recommendedMaxKb: 1200,
    filenameSuffix: 'ig-story-9x16',
    previewTemplate: 'ig-story',
    usageNote:
      'Full-screen 1080×1920 vertical canvas for Instagram Stories, Reels covers, and vertical ads.',
  },
  {
    id: 'ig-landscape',
    platform: 'instagram',
    group: 'Feed Posts',
    name: 'Instagram Landscape',
    shortName: 'Landscape 1.91:1',
    ratioLabel: '1.91:1',
    width: 1080,
    height: 566,
    maxSizeMb: 30,
    recommendedMaxKb: 600,
    filenameSuffix: 'ig-landscape',
    previewTemplate: 'ig-post',
    usageNote:
      'Wide horizontal Instagram feed post ratio for panoramas and wide storefront headers.',
  },

  // YouTube Presets
  {
    id: 'yt-thumb',
    platform: 'youtube',
    group: 'Video & Channel',
    name: 'YouTube Thumbnail',
    shortName: 'Thumbnail 16:9',
    ratioLabel: '16:9',
    width: 1280,
    height: 720,
    maxSizeMb: 2,
    recommendedMaxKb: 1600,
    filenameSuffix: 'yt-thumb-1280x720',
    previewTemplate: 'yt-thumb',
    usageNote:
      'Official 1280×720 HD video thumbnail (strict 2 MB YouTube Studio file size cap).',
  },
  {
    id: 'yt-banner',
    platform: 'youtube',
    group: 'Video & Channel',
    name: 'YouTube Channel Banner',
    shortName: 'Channel Banner',
    ratioLabel: '16:9',
    width: 2560,
    height: 1440,
    maxSizeMb: 6,
    recommendedMaxKb: 3500,
    filenameSuffix: 'yt-banner-2560x1440',
    previewTemplate: 'yt-banner',
    usageNote:
      'Full 2560×1440 TV/Desktop/Mobile channel header. Keep logos inside the central safe band.',
  },

  // TikTok Presets
  {
    id: 'tt-vertical',
    platform: 'tiktok',
    group: 'Video & Photo Mode',
    name: 'TikTok Vertical / Photo Post',
    shortName: 'Vertical 9:16',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    maxSizeMb: 20,
    recommendedMaxKb: 1200,
    filenameSuffix: 'tiktok-9x16',
    previewTemplate: 'tt-video',
    usageNote:
      'Standard 1080×1920 vertical frame for TikTok photo carousels and video cover slides.',
  },
  {
    id: 'tt-profile',
    platform: 'tiktok',
    group: 'Profile',
    name: 'TikTok Profile Avatar',
    shortName: 'Profile 1:1',
    ratioLabel: '1:1',
    width: 400,
    height: 400,
    maxSizeMb: 10,
    recommendedMaxKb: 250,
    filenameSuffix: 'tiktok-avatar-400',
    previewTemplate: 'tt-profile',
    usageNote:
      'Crisp 400×400 square profile photo displayed inside a circular TikTok avatar mask.',
  },

  // X (Twitter) Presets
  {
    id: 'x-landscape',
    platform: 'x',
    group: 'Posts & Profile',
    name: 'X Landscape Post',
    shortName: 'Post 16:9',
    ratioLabel: '16:9',
    width: 1600,
    height: 900,
    maxSizeMb: 15,
    recommendedMaxKb: 1000,
    filenameSuffix: 'x-post-16x9',
    previewTemplate: 'x-post',
    usageNote:
      'Sharp 1600×900 widescreen media post rendered uncropped in the X timeline.',
  },
  {
    id: 'x-square',
    platform: 'x',
    group: 'Posts & Profile',
    name: 'X Square Post',
    shortName: 'Post 1:1',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    maxSizeMb: 15,
    recommendedMaxKb: 800,
    filenameSuffix: 'x-post-1x1',
    previewTemplate: 'x-post',
    usageNote:
      'Balanced 1080×1080 square attachment for single-image announcements and product promos.',
  },
  {
    id: 'x-header',
    platform: 'x',
    group: 'Posts & Profile',
    name: 'X Profile Header',
    shortName: 'Header 3:1',
    ratioLabel: '3:1',
    width: 1500,
    height: 500,
    maxSizeMb: 5,
    recommendedMaxKb: 700,
    filenameSuffix: 'x-header-1500x500',
    previewTemplate: 'x-header',
    usageNote:
      'Official 1500×500 (3:1) X profile banner; avoid placing text near the bottom-left avatar area.',
  },

  // Custom Size Preset
  {
    id: 'custom-size',
    platform: 'custom',
    group: 'Custom Dimensions',
    name: 'Custom Width × Height',
    shortName: 'Custom W×H',
    ratioLabel: 'Custom',
    width: 1200,
    height: 1200,
    maxSizeMb: 25,
    recommendedMaxKb: 1500,
    filenameSuffix: 'custom',
    previewTemplate: 'custom',
    usageNote:
      'Specify exact pixel dimensions for any marketplace banner, blog hero, or storefront slot.',
  },
];

export function computeRatioLabel(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '1:1';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const rw = Math.round(width / divisor);
  const rh = Math.round(height / divisor);
  if (rw <= 24 && rh <= 24) {
    return `${rw}:${rh}`;
  }
  const ratio = width / height;
  if (ratio >= 1) return `${ratio.toFixed(2)}:1`;
  return `1:${(height / width).toFixed(2)}`;
}

export function resolveActivePreset(
  preset: LinePreset,
  framing: FramingState
): LinePreset {
  if (preset.platform !== 'custom') return preset;
  const w = Math.max(64, Math.min(4096, Math.round(framing.customWidth || 1200)));
  const h = Math.max(64, Math.min(4096, Math.round(framing.customHeight || 1200)));
  return {
    ...preset,
    width: w,
    height: h,
    ratioLabel: computeRatioLabel(w, h),
    filenameSuffix: `${w}x${h}`,
  };
}

export const DEFAULT_BG_REMOVAL = {
  enabled: false,
  mode: 'auto-edge' as const,
  tolerance: 28,
  smoothness: 3,
  edgeTrim: 0,
  removeInteriorHoles: true,
  defringe: true,
  targetColor: '#FFFFFF',
};

export const DEFAULT_LOGO_WATERMARK = {
  enabled: true,
  sizePercent: 18,
  opacity: 0.9,
  position: 'bottom-right' as const,
  marginPercent: 5,
  rotation: 0,
  bgRemoval: {
    ...DEFAULT_BG_REMOVAL,
    enabled: false,
  },
  gifMotion: 'none' as const,
  gifSpeed: 'normal' as const,
  gifFps: 12,
};

export const DEFAULT_TEXT_WATERMARK = {
  enabled: false,
  text: '© Koto Studio',
  fontStyle: 'display' as const,
  bold: true,
  italic: false,
  sizePercent: 5,
  color: '#FFFFFF',
  opacity: 0.9,
  position: 'bottom-left' as const,
  marginPercent: 5,
  rotation: 0,
  strokeEnabled: true,
  strokeColor: '#2B1E16',
  shadowEnabled: true,
  badgeEnabled: false,
  badgeColor: '#2B1E16',
  badgeOpacity: 0.72,
};

export const DEFAULT_FRAMING: FramingState = {
  fitMode: 'crop',
  autoCropEnabled: true,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  padBackdrop: 'blur',
  padColor: '#FFFFFF',
  blurRadius: 24,
  padInset: 4,
  outputFormat: 'jpeg',
  preserveTransparency: true,
  matteMode: 'white',
  matteColor: '#FFFFFF',
  autoOptimize: true,
  autoDetectFormat: false,
  quality: 0.92,
  scale: 1,
  sharpen: false,
  showGrid: false,
  customWidth: 1200,
  customHeight: 1200,
  lockCustomAspect: false,
  bgRemoval: { ...DEFAULT_BG_REMOVAL },
  logoWatermark: {
    ...DEFAULT_LOGO_WATERMARK,
    bgRemoval: { ...DEFAULT_BG_REMOVAL },
  },
  textWatermark: { ...DEFAULT_TEXT_WATERMARK },
};

export const DEFAULT_PREVIEW_COPY: PreviewCopy = {
  accountName: 'Koto Goods Official',
  title: 'Autumn Uji Matcha Tasting Set',
  description: 'First-harvest ceremonial blend with hand-thrown stoneware bowl.',
  price: '¥3,480',
  tag: 'Limited Release',
  ctaLabel: 'View in LINE Shop',
  couponValidity: 'Valid through Dec 31 · 15% OFF',
};

export const SAMPLE_ASSETS: SampleAsset[] = [
  {
    id: 'sample-matcha',
    title: 'Uji Matcha Set',
    category: '4:3 Landscape',
    aspectHint: 'Ideal for 1.54:1 Product Card',
    src: '/src/assets/images/sample_matcha_latte_1795636253831.jpg',
    webpFileName: 'uji-matcha-set-promo.webp',
    defaultPresetId: 'card-product',
    defaultCopy: {
      accountName: 'Koto Tea House',
      title: 'Ceremonial Iced Matcha & Bowl Set',
      description: 'Stone-milled Uji matcha paired with our studio glazed ceramic bowl.',
      price: '¥3,480',
      tag: 'Seasonal Drop',
      ctaLabel: 'Order on LINE Shop',
      couponValidity: 'Valid through Dec 31 · ¥500 OFF',
    },
  },
  {
    id: 'sample-serum',
    title: 'Botanical Serum',
    category: '3:4 Portrait',
    aspectHint: 'Try Fit & Pad with Blur Fill',
    src: '/src/assets/images/sample_skincare_serum_1795636254486.jpg',
    webpFileName: 'hinoki-botanical-serum.webp',
    defaultPresetId: 'card-product',
    defaultCopy: {
      accountName: 'Sora Botanicals',
      title: 'Hinoki Repair Dropper Serum 30ml',
      description: 'Cold-pressed botanical oil for overnight barrier restoration.',
      price: '¥4,900',
      tag: 'Best Seller',
      ctaLabel: 'Shop Skincare',
      couponValidity: 'Member Exclusive · 20% OFF',
    },
  },
  {
    id: 'sample-sneaker',
    title: 'Sage Runner 04',
    category: '1:1 Square',
    aspectHint: 'Ready for Cards & Coupons',
    src: '/src/assets/images/sample_running_sneaker_1795636254421.jpg',
    webpFileName: 'sage-runner-04-catalog.webp',
    defaultPresetId: 'card-image',
    defaultCopy: {
      accountName: 'Aoyama Footwear',
      title: 'Sage Runner 04 — Suede Edition',
      description: 'Breathable knit upper with cushioned recycled midsole.',
      price: '¥14,800',
      tag: 'New Arrival',
      ctaLabel: 'Check Sizes',
      couponValidity: 'Weekend Flash · Free Shipping',
    },
  },
];
