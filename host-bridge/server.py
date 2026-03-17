#!/usr/bin/env python3
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PORT = int(os.environ.get('MC_OPENCLAW_BRIDGE_PORT', '18891'))
OPENCLAW_BASE_URL = os.environ.get('OPENCLAW_BASE_URL', 'http://127.0.0.1:18789').rstrip('/')
OPENCLAW_GATEWAY_TOKEN = os.environ.get('OPENCLAW_GATEWAY_TOKEN', '')
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

def extract_agent_ids(result):
    if isinstance(result, list):
        return [x for x in result if isinstance(x, str)]
    if isinstance(result, dict):
        details = result.get('details')
        if isinstance(details, dict) and isinstance(details.get('agents'), list):
            return [item.get('id') for item in details['agents'] if isinstance(item, dict) and item.get('id')]
        content = result.get('content')
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and isinstance(item.get('text'), str):
                    try:
                        parsed = json.loads(item['text'])
                        agents = parsed.get('agents')
                        if isinstance(agents, list):
                            return [entry.get('id') for entry in agents if isinstance(entry, dict) and entry.get('id')]
                    except Exception:
                        pass
    return []

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if self.path == '/health':
                return response(self, 200, {'ok': True, 'upstreamBaseUrl': OPENCLAW_BASE_URL, 'hasToken': bool(OPENCLAW_GATEWAY_TOKEN), 'linkedWorkspaces': len(workspace_links)})
            if self.path == '/agents':
                result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}})
                return response(self, 200, {'ok': True, 'result': result.get('result')})
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
                result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}}, token=token)
                return response(self, 200, {'ok': True, 'result': {'valid': True, 'tokenPreview': f'{token[:6]}...', 'agents': result.get('result')}})
            if self.path == '/workspace-links':
                body = parse_json(self)
                workspace_id = str(body.get('workspaceId', '')).strip()
                agent_id = str(body.get('agentId', '')).strip()
                if not workspace_id or not agent_id:
                    return response(self, 422, {'ok': False, 'error': {'message': 'workspaceId and agentId are required.'}})
                result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}})
                if agent_id not in extract_agent_ids(result.get('result')):
                    return response(self, 404, {'ok': False, 'error': {'message': f'Agent not found: {agent_id}'}})
                workspace_links[workspace_id] = agent_id
                return response(self, 200, {'ok': True, 'result': {'workspaceId': workspace_id, 'agentId': agent_id}})
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
    print(f'mc-openclaw-host-bridge listening on :{PORT}, upstream={OPENCLAW_BASE_URL}', flush=True)
    server.serve_forever()
