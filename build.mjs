// Encrypts src/index.html with the passcode and writes index.html (the only page GitHub serves).
// Usage: node build.mjs            (reads the passcode from .passcode)
//        PASSCODE=new-code node build.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";

const ITER = 300000;
const pass = (process.env.PASSCODE || (await readFile(".passcode", "utf8"))).trim();
// Listing photos in src/img/<listing id>_<n>.jpg are embedded so they stay behind the PIN
const photos = {};
for (const f of (await readdir("src/img").catch(() => [])).filter((f) => f.endsWith(".jpg")).sort()) {
  const id = f.split("_")[0];
  (photos[id] ||= []).push("data:image/jpeg;base64," + (await readFile("src/img/" + f)).toString("base64"));
}
let html = (await readFile("src/index.html", "utf8")).replace("{} /*__PHOTOS__*/", () => JSON.stringify(photos));

// Private area: a second PIN (in .privatepin) opens the hidden For one tab. Only a salted hash goes in the page.
let privLock = "{open:false}";
try {
  const pin = (await readFile(".privatepin", "utf8")).trim();
  const ps = crypto.getRandomValues(new Uint8Array(16));
  const pbase = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: ps, iterations: 200000, hash: "SHA-256" }, pbase, 256));
  privLock = `{open:false,s:"${Buffer.from(ps).toString("base64")}",h:"${Buffer.from(bits).toString("base64")}",n:200000}`;
} catch (e) {}
html = html.replace("/*__PRIVLOCK__*/{open:false}", () => privLock);

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
