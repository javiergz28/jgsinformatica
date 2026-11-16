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

test("BOOT has a reversible scroll stage without hiding navigation", () => {
  assert.match(html, /class="boot-sequence" data-boot-sequence/);
  assert.match(html, /class="core-art" data-core-art/);
  assert.match(html, /data-boot-label aria-hidden="true"/);
  assert.match(css, /\.boot-sequence\{position:relative;height:180svh\}/);
  assert.match(css, /\.boot-sequence>\.hero\{position:sticky/);
  assert.match(js, /addEventListener\("scroll", requestRender, \{ passive: true \}\)/);
  assert.match(js, /requestAnimationFrame\(render\)/);
  assert.doesNotMatch(js, /preventDefault\(|scrollTo\(/);
});

test("BOOT uses the same master SVG for static and enhanced states", () => {
  const svg = read("assets/core-01.svg");
  for(const part of ["power-light", "gpu-light", "cooler-light", "fan"]) {
    assert.ok(svg.includes('data-boot="' + part + '"'), "Missing SVG control: " + part);
  }
  assert.match(js, /fetch\("\.\/assets\/core-01\.svg"/);
  assert.match(js, /art\.append\(next\)/);
  assert.match(js, /art\.classList\.add\("is-enhanced"\)/);
  assert.match(js, /data-boot-progress|bootProgress/);
});

test("BOOT falls back cleanly under reduced motion, data savings or JS failure", () => {
  assert.match(js, /reducedMotion\.matches \|\| saveData/);
  assert.match(js, /art\.dataset\.bootFallback = "static"/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.boot-sequence/);
  assert.match(html, /class="core-poster" src="\.\/assets\/core-01\.svg"/);
  assert.match(html, /href="#contacto"/);
});
