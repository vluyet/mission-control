import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ts from '/opt/mission-control/app/node_modules/typescript/lib/typescript.js';
import { pathToFileURL } from 'node:url';

const source = path.resolve('/opt/mission-control/app/src/lib/server/openclaw-server.ts');
const outdir = path.resolve('/tmp/mission-control-openclaw-webhook-tests');

async function loadHelpers() {
  const raw = await fs.readFile(source, 'utf8');
  const extractStart = raw.indexOf('function extractOpenClawWebhookText');
  const looksStart = raw.indexOf('function looksLikeChattyAgentReply');
  const normalizeStart = raw.indexOf('function normalizeOpenClawWebhookPayload');
  const dispatchStart = raw.indexOf('export async function dispatchTaskToOpenClawInDb');
  const snippet = `${raw.slice(extractStart, dispatchStart)}\nexport { extractOpenClawWebhookText, normalizeOpenClawWebhookPayload, normalizeTaskAppFinalComment };`;
  const transpiled = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
    fileName: source
  }).outputText;
  const outfile = path.join(outdir, 'helpers.mjs');
  await fs.mkdir(outdir, { recursive: true });
  await fs.writeFile(outfile, transpiled, 'utf8');
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('normalizeOpenClawWebhookPayload reads documented finished event envelope', async () => {
  const { normalizeOpenClawWebhookPayload } = await loadHelpers();
  const payload = {
    event: 'run.finished',
    data: {
      status: 'completed',
      run: { id: 'run_123', status: 'completed' },
      result: {
        finalText: 'Short task update.'
      }
    }
  };

  const normalized = normalizeOpenClawWebhookPayload(payload);
  assert.equal(normalized.event, 'run.finished');
  assert.equal(normalized.status, 'completed');
  assert.equal(normalized.progressText, null);
  assert.equal(normalized.finalText, 'Short task update.');
});

test('normalizeOpenClawWebhookPayload keeps backward compatibility with current bridge payloads', async () => {
  const { normalizeOpenClawWebhookPayload } = await loadHelpers();
  const payload = {
    event: 'completed',
    status: 'completed',
    result: {
      responseId: 'resp_1',
      finalText: 'Task done.'
    }
  };

  const normalized = normalizeOpenClawWebhookPayload(payload);
  assert.equal(normalized.event, 'completed');
  assert.equal(normalized.status, 'completed');
  assert.equal(normalized.finalText, 'Task done.');
});

test('normalizeTaskAppFinalComment rejects chatty assistant-style text', async () => {
  const { normalizeTaskAppFinalComment } = await loadHelpers();
  assert.equal(normalizeTaskAppFinalComment("Here's a detailed review of the bridge protocol and endpoint inventory."), null);
  assert.equal(normalizeTaskAppFinalComment('Blocked waiting for API token rotation.'), 'Blocked waiting for API token rotation.');
});
