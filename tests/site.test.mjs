import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const html = read("index.html");
const css = read("styles.css");
const js = read("script.js");

test("HTML base, idioma, y metadatos de staging", () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html lang="es-UY">/);
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>.*DEV<\/title>/);
});
test("Enlaces y cuatro canales reales de contacto", () => {
  for (const marker of ["id=\"contacto\"", "https://wa.me/59898335277", "tel:+59898335277", "https://www.linkedin.com/in/javier-gutierrez-433096106/", "JG-Soluciones-Informaticas/#contacto"]) {
    assert.ok(html.includes(marker), "Missing contact: " + marker);
  }
  assert.match(html, /class="skip" href="#contenido"/);
});
test("Cinco capítulos en orden y sin casos falsos", () => {
  const headings = ["01 / SYSTEM BOOT", "02 / HARDWARE", "03 / CONNECT", "04 / INTELLIGENCE", "05 / CONTACT"];
  let previous = -1;
  for (const heading of headings) {
    const index = html.indexOf(heading);
    assert.ok(index > previous, "Missing or out of order: " + heading);
    previous = index;
  }
  assert.match(html, /SIN CASOS INVENTADOS/);
});
test("Contenido inicial accesible sin JavaScript", () => {
  assert.match(html, /<h1 id="hero-title">/);
  assert.match(html, /class="core"/);
  assert.match(html, /assets\/core-01.svg/);
  assert.match(html, /<img[^>]*alt="CORE-01:/);
  assert.match(html, /<script src="\.\/script.js" defer><\/script>/);
  assert.doesNotMatch(html, /onload=|onclick=/i);
});
test("Movimiento reducido y diseño móvil incluidos", () => {
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(js, /window\.scrollTo\(/);
});
test("Assets locales y sin dependencias de compilación", () => {
  for (const path of ["index.html", "styles.css", "script.js", "assets/core-01.svg"]) {
    assert.ok(existsSync(join(root, path)));
  }
  const svg = read("assets/core-01.svg");
  assert.match(svg, /<svg /);
  assert.match(svg, /<title /);
  assert.ok(statSync(join(root,"assets/core-01.svg")).size < 12000, "Hero too heavy");
});

test("BOOT scroll is long, reversible, and never traps navigation", () => {
  assert.match(html, /class="boot-sequence" data-boot-sequence/);
  assert.match(html, /class="core-art core-art-cycles" data-core-art/);
  assert.match(html, /data-boot-label aria-hidden="true"/);
  assert.match(css, /\.boot-sequence\{height:580svh/);
  assert.match(css, /\.boot-sequence\{height:430svh/);
  assert.match(css, /\.boot-sequence>\.hero\{position:sticky/);
  assert.match(js, /addEventListener\("scroll", requestRender, \{ passive: true \}\)/);
  assert.match(js, /requestAnimationFrame\(render\)/);
  assert.doesNotMatch(js, /preventDefault\(|scrollTo\(/);
});

test("BOOT combines original 3 lighting poses with 56 actual continuous Blender camera frames", () => {
  assert.match(html, /data-boot-media="blender-cycles"/);
  for (const file of ["core01-off.webp","core01-charging.webp","core01-powered.webp"]) {
    assert.ok(html.includes("./assets/boot/"+file));
  }
  assert.match(html, /data-cinematic-canvas data-frame-count="56"/);
  assert.match(js, /const TOTAL = Number\(canvas\.dataset\.frameCount\)/);
  assert.match(js, /const cameraT = clamp01\(\(progress - 0\.50\) \/ 0\.50\)/);
  assert.match(js, /const PATH = "\.\/assets\/boot\/sequence\/core01-"/);
  assert.match(js, /function enqueue\(index, urgent = false\)/);
  assert.match(js, /function draw\(\)/);
  assert.doesNotMatch(html, /data-boot-frame="button"|data-boot-frame="glass"|data-boot-frame="interior"/);
});

test("BOOT retains accessibility, Save-Data and poster fallback", () => {
  assert.match(js, /reducedMotion\.matches \|\| saveData \|\| slowConnection/);
  assert.match(js, /sequence\.dataset\.bootPhase = "static"/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.boot-sequence/);
  assert.match(css, /canvas\.core-motion-canvas\{display:none!important/);
  assert.match(html, /class="core-poster" src="\.\/assets\/core-01\.svg"/);
  assert.match(html, /<picture class="core-poster-frame">/);
  assert.match(html, /href="#contacto"/);
});

test("CORE-01 is one canonical modular geometry with only essential hardware", () => {
  const svg=read("assets/core-01.svg");
  assert.match(svg, /data-model="CORE-01"/);
  assert.match(svg, /data-geometry-version="2"/);
  assert.match(svg, /viewBox="0 0 900 850"/);
  for (const part of ["chassis", "glass", "motherboard", "gpu", "cooling", "power"]) {
    const count = [...svg.matchAll(new RegExp('data-part="' + part + '"', "g"))].length;
    assert.equal(count, 1, "Expected exactly one " + part);
  }
  assert.ok(Buffer.byteLength(svg) < 9000, "Core visual should remain lightweight");
});

test("BOOT and HARDWARE still share focus target but do not claim WebGL navigation", () => {
  const svg=read("assets/core-01.svg");
  const pose=svg.match(/data-camera-pose="([^"]+)"/)?.[1];
  assert.ok(pose);
  assert.equal(html.match(/data-boot-sequence data-camera-pose="([^"]+)"/)?.[1],pose);
  assert.equal(html.match(/id="servicios"[^>]+data-camera-pose="([^"]+)"/)?.[1],pose);
  assert.equal(html.match(/id="servicios"[^>]+data-focus-part="([^"]+)"/)?.[1],"motherboard");
  assert.match(js,/art\.dataset\.handoffPose = hardware\.dataset\.cameraPose/);
  assert.match(js,/No continuous browser 3D\/WebGL is claimed/);
  assert.match(html,/Fotogramas Cycles reales sincronizados con el scroll/);
});

test("Cycles sequence is source-backed, WebP optimized, complete and included in Pages deploy", () => {
  const manifest=JSON.parse(read("assets/boot/manifest.json"));
  assert.equal(manifest.checkpoint,"CP-003.3-C6.4 / DEV-004");
  assert.equal(manifest.source_scene,"CORE-01-BOOT.blend");
  assert.equal(manifest.source_scene_sha256,"30b3483d07fe039da4a1df884b75bce09fe639172c9f4d6ddfa79f945cce21a4");
  assert.equal(manifest.render_engine,"CYCLES");
  assert.equal(manifest.film_transparent,true);
  assert.equal(manifest.studio_ground_hidden,true);
  assert.equal(manifest.still_frames.length,3);
  assert.deepEqual(manifest.still_frames.map(f=>f.frame),[1,80,96]);
  assert.equal(manifest.sequence.count,56);
  assert.equal(manifest.sequence.frames.length,56);
  assert.equal(manifest.sequence.width,720);
  assert.equal(manifest.sequence.height,720);
  let byteSum=0;
  for (const f of [...manifest.still_frames,...manifest.sequence.frames]) {
    const file="assets/boot/"+f.file;
    assert.ok(existsSync(join(root,file)),file);
    const bytes=readFileSync(join(root,file));
    assert.equal(bytes.subarray(0,4).toString("ascii"),"RIFF");
    assert.equal(bytes.subarray(8,12).toString("ascii"),"WEBP");
    assert.match(f.webp_sha256,/^[a-f0-9]{64}$/);
    assert.ok(bytes.length<150000,file+" is too large");
    byteSum+=bytes.length;
  }
  assert.ok(byteSum<6500000);
  assert.deepEqual(manifest.sequence.frames.map(f=>f.index),
    Array.from({length:56},(_,i)=>i));
  assert.match(read(".github/workflows/ci.yml"),/cp assets\/boot\/sequence\/\*\.webp _site\/assets\/boot\/sequence\//);
});

test("DEV-004 continuous 3D camera geometry maps to the correct storyboard in Blender", () => {
  const manifest=JSON.parse(read("assets/boot/manifest.json"));
  const frames=manifest.sequence.frames;
  const keys=manifest.sequence.keyframes;
  assert.ok(keys.length>=8);
  assert.equal(keys[0][0],0);
  assert.equal(keys.at(-1)[0],1);
  assert.ok(keys[0][1][0]>.9);
  assert.ok(keys.at(-1)[1][0]<.12);
  assert.ok(keys.at(-1)[2][0]<0);
  assert.ok(keys.at(-1)[2][2]>.37);
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1], b=frames[i];
    const distance=Math.hypot(...a.camera_eye.map((v,j)=>v-b.camera_eye[j]));
    assert.ok(distance<0.09,"Camera jumps: "+i+" "+distance);
    assert.ok(Math.abs(a.lens_mm-b.lens_mm)<4,"Lens jumps at "+i);
    assert.ok(b.t>a.t,"Timeline must be monotonic");
  }
  assert.match(html,/data-boot-chapter="real-cycles-camera-path"/);
  assert.match(js,/cameraT = clamp01/);
  assert.match(js,/MAX_PARALLEL = 5/);
  assert.match(js,/MAX_DECODED = 36/);
  assert.match(js,/canvas\.getContext\("2d"/);
  assert.match(css,/mask-image:radial-gradient/);
  assert.doesNotMatch(js,/preventDefault|scrollTo\(/);
});


test("C6.4 RAM cyan LED upgrade uses the same four existing physical memory bars", () => {
  const manifest=JSON.parse(read("assets/boot/manifest.json"));
  assert.match(manifest.visual_upgrades, /Four existing RAM cyan LED lightbars/);
  assert.match(manifest.visual_upgrades, /no geometry added or removed/);
  assert.equal(manifest.previous_scene_sha256,
    "222b84a7b6cb468376c3ce17784a13d9c92eddea6dc62c500a622e8fcf786607");
  assert.equal(manifest.source_modified,true);
  assert.equal(manifest.sequence.frames.length,56);
  const last=manifest.sequence.frames.at(-1);
  assert.equal(last.camera_target[0],-.073);
  assert.ok(last.bytes>20000);
});


test("DEV-005 camera sequence only preloads nearby frames", () => {
  const js = read("script.js");
  const preload = js.split("function preload() {")[1]?.split("\n  function draw()")[0];
  assert.ok(preload, "preload function should be present");
  assert.match(preload, /i < 8; i \+= 1\) enqueue\(i\)/);
  assert.doesNotMatch(preload, /i < TOTAL|enqueue\(TOTAL - 1\)/);
  assert.match(js, /\[-3, -2, -1, 8, 7, 6, 5, 4, 3, 2, 1, 0\]/);
});

test("DEV-005 cinematic canvas progressively feathers opaque interior edges", () => {
  const css = read("styles.css");
  const js = read("script.js");
  assert.match(css, /canvas\.core-motion-canvas\{[\s\S]*?mask-image:radial-gradient\(ellipse var\(--boot-mask-x\) var\(--boot-mask-y\)/);
  assert.match(js, /const edgeBlend = smooth\(0\.54, 0\.90, cameraT\)/);
  assert.match(js, /\["--boot-mask-edge", 100, 75\]/);
});
