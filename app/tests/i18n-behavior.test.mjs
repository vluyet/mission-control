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

test("agent docs stay in English when locale cookie is French", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const response = await fetch(`${baseUrl}/docs/agents`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("Sample payloads"));
  assert.ok(html.includes("Read task with resolved context"));
  assert.ok(html.includes("Core resources"));
  assert.doesNotMatch(html, />Exemples de payloads</);
  assert.doesNotMatch(html, />Ressources principales</);
});

test("member directory localizes the seeded owner identity in French", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const response = await fetch(`${baseUrl}/members`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes("Propriétaire"));
  assert.ok(
    html.includes("Propriétaire de l’espace de travail")
      || html.includes("Propriétaire de l'espace de travail")
      || html.includes("Propriétaire de l&#x27;espace de travail")
  );
  assert.doesNotMatch(html, />Owner</);
  assert.ok(!html.includes("Workspace Owner"));
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

test("project and task detail pages keep user-facing French labels localized", async () => {
  const cookie = await signIn();
  const localizedCookie = combineCookies(cookie, "mission_control_locale=fr");
  const projectsResponse = await fetch(`${baseUrl}/projects`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(projectsResponse.status, 200);

  const projectsHtml = await projectsResponse.text();
  const projectMatch = projectsHtml.match(/href="\/projects\/([^"/?#]+)"/);
  assert.ok(projectMatch, "expected a project link on the projects page");

  const projectResponse = await fetch(`${baseUrl}/projects/${projectMatch[1]}`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(projectResponse.status, 200);

  const projectHtml = await projectResponse.text();
  assert.ok(projectHtml.includes("Projet"));
  assert.ok(!projectHtml.includes("COMMON.PROJECT"));
  assert.ok(!projectHtml.includes("common.project"));

  const tasksResponse = await fetch(`${baseUrl}/my-tasks`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(tasksResponse.status, 200);

  const tasksHtml = await tasksResponse.text();
  const taskMatch = tasksHtml.match(/href="(\/tasks\/[^"/?#]+)"/);
  assert.ok(taskMatch, "expected a task link on the my tasks page");

  const taskResponse = await fetch(`${baseUrl}${taskMatch[1]}`, {
    headers: { cookie: localizedCookie }
  });

  assert.equal(taskResponse.status, 200);

  const taskHtml = await taskResponse.text();
  assert.ok(taskHtml.includes("Actions rapides"));
  assert.ok(taskHtml.includes("Aide"));
  assert.match(taskHtml, />(?:En cours|En revue|Bloqué|Terminé|À faire)</);
  assert.doesNotMatch(taskHtml, />In Progress</);
  assert.doesNotMatch(taskHtml, />In Review</);
  assert.doesNotMatch(taskHtml, />Blocked</);
  assert.doesNotMatch(taskHtml, />Done</);
  assert.doesNotMatch(taskHtml, />Todo</);
  assert.doesNotMatch(taskHtml, />Medium</);
});
