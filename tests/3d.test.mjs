import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "assets/3d/CORE-01-prototype.blend");
const exported = join(root, "assets/3d/CORE-01-prototype.glb");

test("The Blender master is present and editable", () => {
  const b = readFileSync(source);
  const isNative = b.subarray(0, 7).toString() === "BLENDER";
  const isZstd = b.readUInt32LE(0) === 0xfd2fb528;
  assert.ok(isNative || isZstd, "Expected native or zstd-compressed Blender file");
  assert.ok(b.length > 10_000);
});

test("CORE-01 is a valid compact glTF 2.0 binary", () => {
  const b = readFileSync(exported);
  assert.equal(b.toString("ascii", 0, 4), "glTF");
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  assert.ok(b.length < 900_000, "3D download exceeded the current prototype budget");
  assert.equal(b.readUInt32LE(16), 0x4e4f534a, "First chunk must be JSON");
});

const b = readFileSync(exported);
const jsonLength = b.readUInt32LE(12);
const scene = JSON.parse(b.subarray(20, 20 + jsonLength).toString("utf8"));
const nodes = (scene.nodes ?? []).map(n => n.name ?? "");

test("One purposeful hardware assembly with recognizable visible parts", () => {
  const expected = [
    "GPU | fan bezel 1", "GPU | fan bezel 2",
    "MOTHERBOARD | RAM 1 graphite heatspreader",
    "MOTHERBOARD | RAM 2 graphite heatspreader",
    "MOTHERBOARD | M.2 storage",
    "CHASSIS | PSU bottom cover",
    "COOLING | fan hub"
  ];
  for (const name of expected) assert.ok(nodes.includes(name), "Missing: " + name);
  assert.ok((scene.meshes?.length ?? 0) >= 65);
  assert.ok((scene.meshes?.length ?? 0) < 110, "Too many independent meshes");
  assert.ok((scene.materials?.length ?? 0) <= 14, "Excessive material count");
  assert.ok(!nodes.some(n => n.startsWith("RENDER ONLY")), "Render studio leaked into model");
});

test("Single camera and reversible source animations are exported", () => {
  assert.equal(scene.cameras?.length, 1);
  assert.equal(scene.animations?.length, 2);
  assert.ok(nodes.includes("CAM | SEQUENCE animated"));
  assert.ok(nodes.includes("COOLING | rotor animated"));
  for (const a of scene.animations) assert.ok(a.channels?.length > 0);
});

test("Review previews exist, display normally and are lightweight", () => {
  for (const filename of ["CORE-01-boot-review.jpg", "CORE-01-hardware-review.jpg"]) {
    const path = join(root, "assets/3d", filename);
    const img = readFileSync(path);
    assert.equal(img[0], 0xff);
    assert.equal(img[1], 0xd8);
    assert.equal(img[img.length - 2], 0xff);
    assert.equal(img[img.length - 1], 0xd9);
    assert.ok(statSync(path).size < 250_000, filename + " exceeded review image budget");
  }
});
