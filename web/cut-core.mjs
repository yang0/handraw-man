/**
 * Pure operations on EXISTING image pixels and placement metadata.
 * Never synthesize human geometry, SVG paths or character strokes.
 */
export const PART_CATEGORIES = Object.freeze([
  "full-body", "head", "neck", "torso", "left-arm", "right-arm",
  "left-leg", "right-leg", "hand", "foot", "other"
]);
export const ANCHOR_NAMES = Object.freeze([
  "head", "neck", "shoulderL", "shoulderR", "elbowL", "elbowR",
  "wristL", "wristR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR", "ground"
]);

export function clampCrop(input, imageWidth, imageHeight) {
  if (![imageWidth, imageHeight].every(n => Number.isInteger(n) && n > 0)) throw Error("源图尺寸无效");
  if (!input || !["x", "y", "width", "height"].every(k => Number.isFinite(input[k]))) throw Error("裁切区域无效");
  const left = Math.max(0, Math.min(imageWidth, Math.floor(input.x)));
  const top = Math.max(0, Math.min(imageHeight, Math.floor(input.y)));
  const right = Math.max(left, Math.min(imageWidth, Math.ceil(input.x + input.width)));
  const bottom = Math.max(top, Math.min(imageHeight, Math.ceil(input.y + input.height)));
  if (right - left < 8 || bottom - top < 8) throw Error("裁切区域至少需要 8×8 像素");
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function defaultCrop(width, height) {
  const margin = Math.max(0, Math.min(32, Math.floor(Math.min(width, height) * 0.06)));
  return clampCrop({ x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 }, width, height);
}

export function imagePoint(clientX, clientY, rect, width, height) {
  if (!rect || !(rect.width > 0 && rect.height > 0)) throw Error("图片未显示");
  const x = Math.max(0, Math.min(width, (clientX - rect.left) / rect.width * width));
  const y = Math.max(0, Math.min(height, (clientY - rect.top) / rect.height * height));
  return { x, y };
}

export function anchorFromImage(point, crop) {
  if (!point || !crop || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw Error("锚点无效");
  if (point.x < crop.x || point.y < crop.y || point.x > crop.x + crop.width || point.y > crop.y + crop.height) {
    throw Error("锚点需要标记在裁切区域内");
  }
  return {
    x: Math.round((point.x - crop.x) / crop.width * 10000) / 10000,
    y: Math.round((point.y - crop.y) / crop.height * 10000) / 10000
  };
}

export function assertAnchors(anchors) {
  if (!anchors || typeof anchors !== "object" || Array.isArray(anchors)) throw Error("锚点结构无效");
  for (const [name, p] of Object.entries(anchors)) {
    if (!ANCHOR_NAMES.includes(name)) throw Error("锚点名称不合法：" + name);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
      throw Error("锚点坐标必须在 0..1 内");
    }
  }
  return anchors;
}

export function safeSlug(name) {
  return String(name || "asset").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72).toLowerCase() || "asset";
}

/**
 * Remove only near-white pixels connected to the OUTSIDE canvas border.
 * This is background removal of an EXISTING image, never character drawing.
 * Returns number of cleared pixels. Preserves enclosed white fills.
 */
export function eraseConnectedWhiteBackground(imageData, threshold = 245) {
  const { width, height, data } = imageData || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width * height > 16000000 || !data || data.length !== width * height * 4) {
    throw Error("像素数据无效或尺寸过大");
  }
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) throw Error("阈值需为 0..255");
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let tail = 0;
  let head = 0;
  function enqueue(i) {
    if (visited[i]) return;
    visited[i] = 1;
    const offset = i * 4;
    if (data[offset + 3] > 0 && data[offset] >= threshold &&
        data[offset + 1] >= threshold && data[offset + 2] >= threshold) {
      queue[tail++] = i;
    }
  }
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++];
    data[i * 4 + 3] = 0;
    const x = i % width, y = Math.floor(i / width);
    if (x > 0) enqueue(i - 1);
    if (x + 1 < width) enqueue(i + 1);
    if (y > 0) enqueue(i - width);
    if (y + 1 < height) enqueue(i + width);
  }
  return tail;
}

export function makeDerivativeRecord({ source, crop, anchors, category, pngHash, zIndex = 0, removeWhite = false, revisions = [] }) {
  if (!source || !source.sha256 || !/^[a-f0-9]{64}$/.test(source.sha256)) throw Error("原图 SHA-256 缺失");
  if (!/^[a-f0-9]{64}$/.test(pngHash || "")) throw Error("裁切 PNG SHA-256 缺失");
  if (!PART_CATEGORIES.includes(category)) throw Error("部件分类无效");
  if (!Number.isInteger(zIndex) || zIndex < -100 || zIndex > 100) throw Error("图层顺序无效");
  assertAnchors(anchors);
  const safeCrop = clampCrop(crop, source.width, source.height);
  return {
    schemaVersion: 1,
    id: "part-" + safeSlug(source.name) + "-" + pngHash.slice(0, 12),
    sourceKind: source.sourceKind,
    category,
    reviewStatus: "draft",
    phase1Ready: false,
    original: {
      filename: source.name,
      sourceAssetId: source.assetId || null,
      sourceUrl: source.sourceUrl || null,
      originalGitBlobHash: source.gitBlobHash || null,
      sha256: "sha256:" + source.sha256,
      width: source.width,
      height: source.height,
      licenseEvidence: source.licenseEvidence || "pending"
    },
    processed: {
      filename: "part-" + safeSlug(source.name) + "-" + pngHash.slice(0, 12) + ".png",
      sha256: "sha256:" + pngHash,
      mime: "image/png",
      width: safeCrop.width,
      height: safeCrop.height,
      crop: safeCrop,
      processing: removeWhite ? "rect-crop-and-connected-white-background-removal" : "rect-crop-only"
    },
    anchors: structuredClone(anchors),
    zIndex,
    revisions: structuredClone(revisions)
  };
}

export function anchorLocation(part, name) {
  const anchor = part?.metadata?.anchors?.[name];
  if (!anchor) throw Error("所选部件缺少锚点：" + name);
  const scaledX = (anchor.x - 0.5) * part.width * part.scale;
  const scaledY = (anchor.y - 0.5) * part.height * part.scale;
  const radians = part.rotation * Math.PI / 180;
  return {
    x: part.x + scaledX * Math.cos(radians) - scaledY * Math.sin(radians),
    y: part.y + scaledX * Math.sin(radians) + scaledY * Math.cos(radians)
  };
}

export function alignPartAnchors(moving, movingAnchor, reference, referenceAnchor) {
  const target = anchorLocation(reference, referenceAnchor);
  const point = anchorLocation(moving, movingAnchor);
  return { ...moving, x: moving.x + target.x - point.x, y: moving.y + target.y - point.y };
}
