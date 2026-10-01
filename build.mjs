// Encrypts src/index.html with the passcode and writes index.html (the only page GitHub serves).
// Usage: node build.mjs            (reads the passcode from .passcode)
//        PASSCODE=new-code node build.mjs
import { readFile, writeFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";

const ITER = 300000;
const pass = (process.env.PASSCODE || (await readFile(".passcode", "utf8"))).trim();
const html = await readFile("src/index.html", "utf8");

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]
);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(html)));

const b64 = (b) => Buffer.from(b).toString("base64");
const payload = JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(ct), n: ITER });
const shell = (await readFile("lock.html", "utf8")).replace("__PAYLOAD__", () => payload);
await writeFile("index.html", shell);
console.log(`Built index.html (${(shell.length / 1024).toFixed(0)} KB, encrypted)`);
