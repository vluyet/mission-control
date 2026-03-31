import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import ts from '/opt/mission-control/app/node_modules/typescript/lib/typescript.js';
import { pathToFileURL } from 'node:url';

const openclawSource = path.resolve('/opt/mission-control/app/src/lib/openclaw.ts');
const outdir = path.resolve('/tmp/mission-control-openclaw-tests');

async function loadOpenClawModule() {
  const source = await fs.readFile(openclawSource, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    },
    fileName: openclawSource
  }).outputText;

  const outfile = path.join(outdir, 'openclaw.mjs');
  await fs.mkdir(outdir, { recursive: true });
  await fs.writeFile(outfile, transpiled, 'utf8');

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('fetchOpenClawAgents uses bridge /agents endpoint', async () => {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url, init });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          result: {
            agents: [{ id: 'nova', name: 'Nova', capabilities: ['code'] }]
          }
        };
      }
    };
  };

  const { fetchOpenClawAgents } = await loadOpenClawModule();
  const result = await fetchOpenClawAgents({
    baseUrl: 'http://127.0.0.1:18891',
    gatewayToken: 'bridge-token'
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:18891/agents');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.headers.authorization, 'Bearer bridge-token');
  assert.deepEqual(result, [{ id: 'nova', name: 'Nova', capabilities: ['code'] }]);
});

test('dispatchOpenClawTaskRun uses bridge /dispatch endpoint', async () => {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url, init });
    return {
      ok: true,
      status: 202,
      async json() {
        return {
          ok: true,
          result: {
            accepted: true,
            response: {
              responseId: 'resp-123',
              finalText: null,
              mode: 'async'
            }
          }
        };
      }
    };
  };

  const { dispatchOpenClawTaskRun } = await loadOpenClawModule();
  const result = await dispatchOpenClawTaskRun({
    baseUrl: 'http://127.0.0.1:18891',
    gatewayToken: 'bridge-token',
    agentId: 'nova',
    taskId: 'task-1',
    workspaceId: 'ws-1',
    message: 'Do the work',
    webhookUrl: 'https://mc.example/api/tasks/task-1/openclaw/webhook',
    webhookToken: 'webhook-token'
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'http://127.0.0.1:18891/dispatch');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers.authorization, 'Bearer bridge-token');
  const body = JSON.parse(requests[0].init.body);
  assert.deepEqual(body, {
    agentId: 'nova',
    taskId: 'task-1',
    workspaceId: 'ws-1',
    prompt: 'Do the work',
    webhookUrl: 'https://mc.example/api/tasks/task-1/openclaw/webhook',
    webhookToken: 'webhook-token',
    source: 'mission-control'
  });
  assert.equal(result.responseId, 'resp-123');
  assert.equal(result.accepted, true);
  assert.equal(result.finalText, null);
});

test('dispatchOpenClawTaskRun extracts sync final text from bridge result', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    status: 202,
    async json() {
      return {
        ok: true,
        result: {
          accepted: true,
          responseId: 'resp-sync',
          finalText: 'Done via bridge.'
        }
      };
    }
  });

  const { dispatchOpenClawTaskRun } = await loadOpenClawModule();
  const result = await dispatchOpenClawTaskRun({
    baseUrl: 'http://127.0.0.1:18891',
    gatewayToken: 'bridge-token',
    agentId: 'nova',
    taskId: 'task-2',
    workspaceId: 'ws-1',
    message: 'Do the work'
  });

  assert.equal(result.responseId, 'resp-sync');
  assert.equal(result.finalText, 'Done via bridge.');
  assert.equal(result.accepted, true);
});
