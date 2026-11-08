import test from "node:test";
import assert from "node:assert/strict";
import {
  clampCrop, defaultCrop, imagePoint, anchorFromImage, assertAnchors,
  safeSlug, eraseConnectedWhiteBackground, makeDerivativeRecord,
  anchorLocation, alignPartAnchors
} from "../web/cut-core.mjs";

test("crop handles fractional edges and rejects out of bounds / empty selections", () => {
  assert.deepEqual(clampCrop({x: 10.2, y: 20.1, width: 32.3, height: 40.4}, 100, 120),
    {x: 10, y: 20, width: 33, height: 41});
  assert.deepEqual(defaultCrop(100, 100), {x: 6, y: 6, width: 88, height: 88});
  assert.throws(() => clampCrop({x: 120, y: 100, width: 20, height: 20}, 100, 100), /至少需要/);
  assert.throws(() => clampCrop({x: NaN, y: 0, width: 30, height: 30}, 100, 100), /无效/);
});
test("UI clicks map to image pixel coordinates and normalized crop anchors", () => {
  const p = imagePoint(130, 220, {left: 30, top: 20, width: 200, height: 400}, 400, 800);
  assert.deepEqual(p, {x: 200, y: 400});
  assert.deepEqual(anchorFromImage(p, {x: 100,y: 200,width: 200,height: 400}), {x:0.5, y:0.5});
  assert.throws(() => anchorFromImage({x: -1,y:0}, {x:0,y:0,width:10,height:10}), /裁切区域/);
  assert.throws(() => assertAnchors({neck: {x: 1.1, y:0}}), /0..1/);
});
test("edge-connected white background removal preserves enclosed white fills", () => {
  const width = 5, height = 5;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for(let y=1;y<4;y++)for(let x=1;x<4;x++) {
    if (x===1 || x===3 || y===1 || y===3) {
      const i=(y*width+x)*4;
      data[i]=0;data[i+1]=0;data[i+2]=0;
    }
  }
  const removed = eraseConnectedWhiteBackground({width,height,data});
  assert.equal(removed, 16);
  assert.equal(data[3], 0);
  assert.equal(data[(2*width+2)*4+3], 255, "enclosed white fill must stay");
  assert.equal(data[(1*width+1)*4+3], 255, "black outline must stay");
  assert.throws(() => eraseConnectedWhiteBackground({width,height,data}, -1), /阈值/);
});
test("derivative record retains exact original and processed SHA-256, not fake approval", () => {
  const source={name:"Open Peeps / Test.svg", sourceKind:"open-peeps-cc0",sha256:"a".repeat(64),
    assetId:"open-peeps-head-no-hair-1",gitBlobHash:"git-blob-sha1:"+"b".repeat(40),
    sourceUrl:"https://github.com/a/b",licenseEvidence:"https://www.openpeeps.com/",width:300,height:400};
  const info=makeDerivativeRecord({source, crop:{x:0,y:0,width:100,height:200},
    anchors:{neck:{x:0.5,y:0.75}},category:"head",pngHash:"c".repeat(64),zIndex:4,
    revisions:[{reason:"move neck"}]});
  assert.equal(info.processed.sha256, "sha256:"+"c".repeat(64));
  assert.equal(info.original.sha256, "sha256:"+"a".repeat(64));
  assert.equal(info.reviewStatus, "draft");
  assert.equal(info.phase1Ready, false);
  assert.equal(info.anchors.neck.y, 0.75);
  assert.equal(safeSlug("../../奇怪文件.svg"), "svg");
});
test("anchor-to-anchor alignment only changes placements of existing images", () => {
  const a={width:100,height:100,x:100,y:100,rotation:0,scale:1,metadata:{anchors:{neck:{x:0.5,y:1}}}};
  const b={width:100,height:100,x:200,y:240,rotation:0,scale:1,metadata:{anchors:{neck:{x:0.5,y:0}}}};
  const result=alignPartAnchors(a,"neck",b,"neck");
  assert.deepEqual(anchorLocation(result,"neck"),anchorLocation(b,"neck"));
  assert.equal(result.width,100);
  assert.throws(() => anchorLocation(a,"missing"),/缺少锚点/);
});
