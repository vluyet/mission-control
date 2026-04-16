import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseUrl, signIn, combineCookies } from "./helpers.mjs";

const appDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("translator implementation keeps English fallback lookup for missing locale keys", async () => {
  const source = await fs.readFile(path.join(appDir, "src/lib/i18n/translator.ts"), "utf8");

  assert.match(source, /fallback\s*=\s*getPathValue\(en as unknown as Record<string, NestedValue>, key\)/);
  assert.match(source, /typeof localized === "string" \? localized : typeof fallback === "string" \? fallback : key/);
});

test("language switcher labels are localized in French on a representative server-rendered page", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const response = await fetch(`${baseUrl}/my-tasks`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<label class="sidebar-select-label" for="language-switcher">Langue<\/label>/);
  assert.match(html, />Anglais</);
  assert.match(html, />Français</);
  assert.doesNotMatch(html, />Language</);
});

test("workspace settings render French system copy when locale cookie is set", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const response = await fetch(`${baseUrl}/manage-workspace`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("Réglages de l’espace de travail") || html.includes("Réglages de l&#x27;espace de travail"));
  assert.ok(html.includes("Créer un espace de travail"));
  assert.ok(html.includes("Déplacer les projets vers un autre espace"));
});

test("agent docs sample payload titles are localized in French", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const response = await fetch(`${baseUrl}/docs/agents`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("Exemples de payloads"));
  assert.ok(html.includes("Lire une tâche avec le contexte résolu"));
  assert.ok(html.includes("Créer un projet"));
  assert.ok(html.includes("Publier un commentaire orienté humain"));
  assert.doesNotMatch(html, />Read task with resolved context</);
});

test("visible task and project status labels render in French", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const [tasksResponse, projectsResponse] = await Promise.all([
    fetch(`${baseUrl}/my-tasks`, {
      headers: { cookie: localizedCookie }
    }),
    fetch(`${baseUrl}/projects`, {
      headers: { cookie: localizedCookie }
    })
  ]);

  assert.equal(tasksResponse.status, 200);
  assert.equal(projectsResponse.status, 200);

  const tasksHtml = await tasksResponse.text();
  const projectsHtml = await projectsResponse.text();

  assert.ok(tasksHtml.includes("En revue"));
  assert.ok(tasksHtml.includes("Bloqué"));
  assert.doesNotMatch(tasksHtml, />In Review</);
  assert.doesNotMatch(tasksHtml, />Blocked</);

  assert.ok(projectsHtml.includes("Dans les temps") || projectsHtml.includes("À revoir") || projectsHtml.includes("À risque"));
  assert.doesNotMatch(projectsHtml, />On track</);
  assert.doesNotMatch(projectsHtml, />Needs review</);
});
