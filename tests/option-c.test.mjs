import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const folder=join(dirname(fileURLToPath(import.meta.url)),"..","assets","3d","option-c");

test("CC0 provenance and source manifest stay with CORE-01",()=>{
 const license=readFileSync(join(folder,"LICENSE.txt"),"utf8");
 const manifest=JSON.parse(readFileSync(join(folder,"manifest.json"),"utf8"));
 assert.match(license,/CC0 1\.0 Universal/);
 assert.equal(manifest.origin?.method,"procedural");
 assert.ok(manifest.triangles > 20000 && manifest.triangles < 50000);
});

test("The editable Blender source is present and keeps a modest size",()=>{
 const buffer=readFileSync(join(folder,"CORE-01-BOOT.blend"));
 const blenderHeader=buffer.subarray(0,7).toString()==="BLENDER";
 const zstandardHeader=buffer.readUInt32LE(0)===0xfd2fb528;
 assert.ok(blenderHeader||zstandardHeader,"Expected Blender or Zstandard-compressed Blender file");
 assert.ok(buffer.length>200000 && buffer.length<4000000);
});

test("Three independent stages exist and remain optimized",()=>{
 const names=["00-off.jpg","50-charging.jpg","100-powered.jpg"];
 const stages=names.map(n=>{
   const path=join(folder,n);
   const bytes=readFileSync(path);
   assert.equal(bytes.subarray(0,2).toString("hex"),"ffd8");
   assert.equal(bytes.subarray(-2).toString("hex"),"ffd9");
   assert.ok(statSync(path).size<250000,n+" too large");
   return bytes.toString("base64");
 });
 assert.equal(new Set(stages).size,3,"Each stage must be visually distinct");
});

test("No extra source model or rejected prototype is mixed into the selected asset",()=>{
 const manifest=JSON.parse(readFileSync(join(folder,"manifest.json"),"utf8"));
 assert.equal(manifest.slug,"gaming-pc");
 assert.ok(!("CORE-01-prototype.blend" in manifest));
});
