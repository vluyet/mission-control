import http from 'node:http';

const port = Number(process.env.PORT || 18890);
const upstreamBaseUrl = String(process.env.OPENCLAW_BASE_URL || 'http://host.docker.internal:18789').replace(/\/+$/, '');
const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// MVP in-memory link registry (workspaceId -> agentId)
const workspaceLinks = new Map();

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

async function invokeTool(tool, args = {}, token = gatewayToken) {
  const response = await fetch(`${upstreamBaseUrl}/tools/invoke`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ tool, args })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `OpenClaw tool invoke failed (${response.status})`);
  }
  return payload?.result;
}


function extractAgentIds(agentsListResult) {
  if (Array.isArray(agentsListResult)) return agentsListResult;
  const detailsAgents = agentsListResult?.details?.agents;
  if (Array.isArray(detailsAgents)) return detailsAgents.map((agent) => agent?.id).filter(Boolean);

  const textPayload = agentsListResult?.content?.find((item) => item?.type === 'text')?.text;
  if (typeof textPayload === 'string') {
    try {
      const parsed = JSON.parse(textPayload);
      if (Array.isArray(parsed?.agents)) return parsed.agents.map((agent) => agent?.id).filter(Boolean);
    } catch {}
  }

  return [];
}

async function dispatchTask({ agentId, taskId, prompt }, token = gatewayToken) {
  const response = await fetch(`${upstreamBaseUrl}/v1/responses`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
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
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;

  try {
    if (req.method === 'GET' && pathname === '/health') {
      return json(res, 200, {
        ok: true,
        upstreamBaseUrl,
        hasToken: Boolean(gatewayToken),
        linkedWorkspaces: workspaceLinks.size
      });
    }

    // 1) discover/linkable agents
    if (req.method === 'GET' && pathname === '/agents') {
      const result = await invokeTool('agents_list', {});
      return json(res, 200, { ok: true, result });
    }

    // 2) validate identity with a provided token
    if (req.method === 'POST' && pathname === '/identity/validate') {
      const body = await readBody(req);
      if (!body?.token) {
        return json(res, 422, { ok: false, error: { message: 'token is required.' } });
      }
      const agents = await invokeTool('agents_list', {}, body.token);
      return json(res, 200, {
        ok: true,
        result: {
          valid: true,
          tokenPreview: `${String(body.token).slice(0, 6)}...`,
          agents
        }
      });
    }

    // 3) link agent to workspace
    if (req.method === 'POST' && pathname === '/workspace-links') {
      const body = await readBody(req);
      const workspaceId = String(body?.workspaceId || '').trim();
      const agentId = String(body?.agentId || '').trim();
      if (!workspaceId || !agentId) {
        return json(res, 422, { ok: false, error: { message: 'workspaceId and agentId are required.' } });
      }

      const availableAgents = await invokeTool('agents_list', {});
      const availableAgentIds = extractAgentIds(availableAgents);
      if (!availableAgentIds.includes(agentId)) {
        return json(res, 404, { ok: false, error: { message: `Agent not found: ${agentId}` } });
      }

      workspaceLinks.set(workspaceId, agentId);
      return json(res, 200, { ok: true, result: { workspaceId, agentId } });
    }

    if (req.method === 'GET' && pathname === '/workspace-links') {
      return json(res, 200, {
        ok: true,
        result: Array.from(workspaceLinks.entries()).map(([workspaceId, agentId]) => ({ workspaceId, agentId }))
      });
    }

    // 4) execute work with linked agent
    if (req.method === 'POST' && pathname === '/workspace-dispatch') {
      const body = await readBody(req);
      const workspaceId = String(body?.workspaceId || '').trim();
      const prompt = String(body?.prompt || '').trim();
      const taskId = String(body?.taskId || '').trim();

      if (!workspaceId || !prompt || !taskId) {
        return json(res, 422, { ok: false, error: { message: 'workspaceId, taskId, and prompt are required.' } });
      }

      const agentId = workspaceLinks.get(workspaceId);
      if (!agentId) {
        return json(res, 404, { ok: false, error: { message: `No linked agent for workspace: ${workspaceId}` } });
      }

      const result = await dispatchTask({ agentId, taskId, prompt });
      return json(res, 200, { ok: true, result: { workspaceId, agentId, response: result } });
    }

    // Backward-compatible direct dispatch path
    if (req.method === 'POST' && pathname === '/dispatch') {
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
