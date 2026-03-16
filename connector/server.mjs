import http from 'node:http';

const port = Number(process.env.PORT || 18790);
const upstreamBaseUrl = String(process.env.OPENCLAW_BASE_URL || 'http://host.docker.internal:18789').replace(/\/+$/, '');
const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function invokeTool(tool, args = {}) {
  const response = await fetch(`${upstreamBaseUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {})
    },
    body: JSON.stringify({ tool, args })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `OpenClaw tool invoke failed (${response.status})`);
  }
  return payload?.result;
}

async function dispatchTask({ agentId, taskId, prompt }) {
  const response = await fetch(`${upstreamBaseUrl}/v1/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {})
    },
    body: JSON.stringify({
      model: `agent:${agentId}`,
      user: `mission-control-task:${taskId}`,
      input: prompt
    })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenClaw response dispatch failed (${response.status})`);
  }
  return payload;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, { ok: true, upstreamBaseUrl, hasToken: Boolean(gatewayToken) });
    }

    if (req.method === 'GET' && req.url === '/agents') {
      const result = await invokeTool('agents_list', {});
      return json(res, 200, { ok: true, result });
    }

    if (req.method === 'POST' && req.url === '/dispatch') {
      const body = await readBody(req);
      if (!body?.agentId || !body?.taskId || !body?.prompt) {
        return json(res, 422, { ok: false, error: { message: 'agentId, taskId, and prompt are required.' } });
      }
      const result = await dispatchTask(body);
      return json(res, 200, { ok: true, result });
    }

    return json(res, 404, { ok: false, error: { message: 'Not found' } });
  } catch (error) {
    return json(res, 502, { ok: false, error: { message: error instanceof Error ? error.message : 'Connector request failed.' } });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`openclaw-connector listening on :${port}, upstream=${upstreamBaseUrl}`);
});
