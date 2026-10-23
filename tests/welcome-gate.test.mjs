import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const experience=fs.readFileSync(new URL("../experience/index.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../welcome-gate.js",import.meta.url),"utf8");
test("Story welcome is included on home and interactive demo",()=>{assert.match(home,/welcome-gate\.js/);assert.match(experience,/welcome-gate\.js/);});
test("Two dates required and adult date validated",()=>{assert.match(script,/name="birthday"/);assert.match(script,/name="wedding"/);assert.match(script,/getFullYear\(\)-18/);assert.match(script,/age 18 and older/);assert.match(script,/wedding<birth/);});
test("No raw birthday or wedding date persistence",()=>{assert.doesNotMatch(script,/localStorage/);assert.match(script,/sessionStorage\.setItem\(key,"yes"\)/);assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|sendBeacon/);});
test("Public terms and privacy remain accessible",()=>{assert.match(script,/href="\/privacy\/"/);assert.match(script,/href="\/terms\/"/);});
test("Script parses",()=>{assert.doesNotThrow(()=>new Function(script));});
