#!/usr/bin/env python3
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PORT = int(os.environ.get('MC_OPENCLAW_BRIDGE_PORT', '18891'))
OPENCLAW_BASE_URL = os.environ.get('OPENCLAW_BASE_URL', 'http://127.0.0.1:18789').rstrip('/')
OPENCLAW_GATEWAY_TOKEN = os.environ.get('OPENCLAW_GATEWAY_TOKEN', '')
OPENCLAW_HOOK_TOKEN = os.environ.get('OPENCLAW_HOOK_TOKEN', '').strip()
workspace_links = {}

def response(handler, status, payload):
    raw = json.dumps(payload).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Content-Length', str(len(raw)))
    handler.end_headers()
    handler.wfile.write(raw)

def parse_json(handler):
    length = int(handler.headers.get('Content-Length', '0') or '0')
    raw = handler.rfile.read(length) if length else b''
    return json.loads(raw.decode('utf-8')) if raw else {}

def openclaw_request(path, payload=None, token=None):
    headers = {'Content-Type': 'application/json'}
    auth = token or OPENCLAW_GATEWAY_TOKEN
    if auth:
        headers['Authorization'] = f'Bearer {auth}'
    data = None if payload is None else json.dumps(payload).encode('utf-8')
    req = Request(f'{OPENCLAW_BASE_URL}{path}', data=data, headers=headers, method='POST' if payload is not None else 'GET')
    with urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode('utf-8'))

def extract_text(value):
    if isinstance(value, str):
        text = value.strip()
        return text or None
    if isinstance(value, list):
        for item in value:
            text = extract_text(item)
            if text:
                return text
        return None
    if isinstance(value, dict):
        for key in ['response', 'message', 'output', 'output_text', 'text', 'finalText', 'resultText', 'summary']:
            text = extract_text(value.get(key))
            if text:
                return text
        for key in ['result', 'data', 'details']:
            text = extract_text(value.get(key))
            if text:
                return text
        content = value.get('content')
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict):
                    text = extract_text(item.get('text'))
                    if text:
                        return text
    return None

def dispatch_openclaw(agent_id, task_id, prompt):
    attempts = [
        ('/hooks/agent', {
            'agentId': agent_id,
            'message': prompt,
            'wakeMode': 'now',
            'deliver': False,
            'thinking': 'medium',
            'timeoutSeconds': 120
        }, 'hook', OPENCLAW_HOOK_TOKEN or OPENCLAW_GATEWAY_TOKEN),
        ('/v1/responses', {
            'model': f'agent:{agent_id}',
            'user': f'mission-control-task:{task_id}',
            'input': prompt
        }, 'legacy', OPENCLAW_GATEWAY_TOKEN)
    ]

    last_error = 'OpenClaw dispatch failed.'

    for path, payload, mode, token in attempts:
        try:
            result = openclaw_request(path, payload, token=token)
            result_payload = result.get('result') if mode == 'hook' and isinstance(result, dict) else result
            final_text = extract_text(result_payload)
            if not final_text:
                last_error = 'OpenClaw dispatch did not return a final response.'
                continue

            response_id = None
            if isinstance(result, dict):
                response_id = result.get('id') or result.get('runId')
                if not response_id and isinstance(result.get('result'), dict):
                    response_id = result['result'].get('id') or (result['result'].get('response') or {}).get('id') if isinstance(result['result'].get('response'), dict) else result['result'].get('id')
            if not response_id and isinstance(result_payload, dict):
                response_id = result_payload.get('id') or (result_payload.get('response') or {}).get('id') if isinstance(result_payload.get('response'), dict) else result_payload.get('id')

            return {
                'responseId': response_id,
                'finalText': final_text,
                'raw': result
            }
        except HTTPError as e:
            if e.code not in (401, 404):
                try:
                    payload = json.loads(e.read().decode('utf-8'))
                    message = payload.get('error', {}).get('message') or f'OpenClaw request failed ({e.code})'
                except Exception:
                    message = f'OpenClaw request failed ({e.code})'
                raise RuntimeError(message)
            last_error = f'OpenClaw request failed ({e.code})'
        except URLError as e:
            raise RuntimeError(str(e.reason))

    raise RuntimeError(last_error)

def extract_agent_ids(result):
    if isinstance(result, list):
        ids = []
        for item in result:
            if isinstance(item, str) and item.strip():
                ids.append(item.strip())
            elif isinstance(item, dict):
                raw_id = item.get('id') or item.get('agentId') or item.get('key') or item.get('name')
                if isinstance(raw_id, str) and raw_id.strip():
                    ids.append(raw_id.strip())
        return ids
    if isinstance(result, dict):
        if isinstance(result.get('agents'), list):
            return extract_agent_ids(result.get('agents'))
        details = result.get('details')
        if isinstance(details, dict) and isinstance(details.get('agents'), list):
            return extract_agent_ids(details.get('agents'))
        sessions = result.get('sessions')
        if isinstance(sessions, list):
            ids = []
            for item in sessions:
                if not isinstance(item, dict):
                    continue
                key = item.get('key')
                if isinstance(key, str) and key.startswith('agent:'):
                    parts = key.split(':', 2)
                    if len(parts) >= 2 and parts[1].strip():
                        ids.append(parts[1].strip())
            return ids
        content = result.get('content')
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and isinstance(item.get('text'), str):
                    try:
                        parsed = json.loads(item['text'])
                        ids = extract_agent_ids(parsed)
                        if ids:
                            return ids
                    except Exception:
                        pass
    return []

def list_sessions_via_cli():
    cmd = ['openclaw', 'gateway', 'call', 'sessions.list', '--params', '{}']
    if OPENCLAW_GATEWAY_TOKEN:
        cmd.extend(['--token', OPENCLAW_GATEWAY_TOKEN])
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=True)
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or '').strip()
        stdout = (exc.stdout or '').strip()
        raise RuntimeError(stderr or stdout or 'openclaw gateway call sessions.list failed')
    raw = (result.stdout or '').strip()
    start = raw.find('{')
    if start < 0:
        raise RuntimeError('openclaw gateway call sessions.list returned no JSON payload')
    return json.loads(raw[start:])

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if self.path == '/health':
                return response(self, 200, {'ok': True, 'upstreamBaseUrl': OPENCLAW_BASE_URL, 'hasToken': bool(OPENCLAW_GATEWAY_TOKEN), 'linkedWorkspaces': len(workspace_links)})
            if self.path == '/agents':
                try:
                    result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}})
                    return response(self, 200, {'ok': True, 'result': result.get('result')})
                except Exception:
                    result = list_sessions_via_cli()
                    agent_ids = sorted(set(extract_agent_ids(result)))
                    agents = [{'id': agent_id, 'name': agent_id, 'capabilities': ['derived:sessions.list']} for agent_id in agent_ids]
                    return response(self, 200, {'ok': True, 'result': agents})
            if self.path == '/workspace-links':
                return response(self, 200, {'ok': True, 'result': [{'workspaceId': k, 'agentId': v} for k, v in workspace_links.items()]})
            return response(self, 404, {'ok': False, 'error': {'message': 'Not found'}})
        except Exception as e:
            return response(self, 502, {'ok': False, 'error': {'message': str(e)}})

    def do_POST(self):
        try:
            if self.path == '/identity/validate':
                body = parse_json(self)
                token = body.get('token')
                if not token:
                    return response(self, 422, {'ok': False, 'error': {'message': 'token is required.'}})
                try:
                    result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}}, token=token)
                    agents = result.get('result')
                except Exception:
                    current_token = OPENCLAW_GATEWAY_TOKEN
                    if token != current_token:
                        raise RuntimeError('Token validates only against the local gateway token path in this bridge mode')
                    result = list_sessions_via_cli()
                    agent_ids = sorted(set(extract_agent_ids(result)))
                    agents = [{'id': agent_id, 'name': agent_id, 'capabilities': ['derived:sessions.list']} for agent_id in agent_ids]
                return response(self, 200, {'ok': True, 'result': {'valid': True, 'tokenPreview': f'{token[:6]}...', 'agents': agents}})
            if self.path == '/workspace-links':
                body = parse_json(self)
                workspace_id = str(body.get('workspaceId', '')).strip()
                agent_id = str(body.get('agentId', '')).strip()
                if not workspace_id or not agent_id:
                    return response(self, 422, {'ok': False, 'error': {'message': 'workspaceId and agentId are required.'}})
                try:
                    result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}})
                    known_agent_ids = extract_agent_ids(result.get('result'))
                except Exception:
                    result = list_sessions_via_cli()
                    known_agent_ids = extract_agent_ids(result)
                if agent_id not in known_agent_ids:
                    return response(self, 404, {'ok': False, 'error': {'message': f'Agent not found: {agent_id}'}})
                workspace_links[workspace_id] = agent_id
                return response(self, 200, {'ok': True, 'result': {'workspaceId': workspace_id, 'agentId': agent_id}})
            if self.path == '/dispatch':
                body = parse_json(self)
                agent_id = str(body.get('agentId', '')).strip()
                task_id = str(body.get('taskId', '')).strip()
                prompt = str(body.get('prompt', '')).strip()
                if not agent_id or not task_id or not prompt:
                    return response(self, 422, {'ok': False, 'error': {'message': 'agentId, taskId, and prompt are required.'}})
                dispatch = dispatch_openclaw(agent_id, task_id, prompt)
                return response(self, 200, {'ok': True, 'result': dispatch})
            if self.path == '/workspace-dispatch':
                body = parse_json(self)
                workspace_id = str(body.get('workspaceId', '')).strip()
                task_id = str(body.get('taskId', '')).strip()
                prompt = str(body.get('prompt', '')).strip()
                if not workspace_id or not task_id or not prompt:
                    return response(self, 422, {'ok': False, 'error': {'message': 'workspaceId, taskId, and prompt are required.'}})
                agent_id = workspace_links.get(workspace_id)
                if not agent_id:
                    return response(self, 404, {'ok': False, 'error': {'message': f'No linked agent for workspace: {workspace_id}'}})
                dispatch = dispatch_openclaw(agent_id, task_id, prompt)
                return response(self, 200, {'ok': True, 'result': {'workspaceId': workspace_id, 'agentId': agent_id, 'response': dispatch}})
            return response(self, 404, {'ok': False, 'error': {'message': 'Not found'}})
        except HTTPError as e:
            try:
                payload = json.loads(e.read().decode('utf-8'))
                message = payload.get('error', {}).get('message') or f'OpenClaw request failed ({e.code})'
            except Exception:
                message = f'OpenClaw request failed ({e.code})'
            return response(self, 502, {'ok': False, 'error': {'message': message}})
        except URLError as e:
            return response(self, 502, {'ok': False, 'error': {'message': str(e.reason)}})
        except Exception as e:
            return response(self, 502, {'ok': False, 'error': {'message': str(e)}})

    def log_message(self, format, *args):
        return

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(
        f'mc-openclaw-host-bridge listening on :{PORT}, upstream={OPENCLAW_BASE_URL}, '
        f'gatewayToken={bool(OPENCLAW_GATEWAY_TOKEN)}, hookToken={bool(OPENCLAW_HOOK_TOKEN)}',
        flush=True
    )
    server.serve_forever()
