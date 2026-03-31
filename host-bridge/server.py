#!/usr/bin/env python3
import json
import os
import subprocess
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PORT = int(os.environ.get('MC_OPENCLAW_BRIDGE_PORT', '18891'))
OPENCLAW_BASE_URL = os.environ.get('OPENCLAW_BASE_URL', 'http://127.0.0.1:18789').rstrip('/')
OPENCLAW_GATEWAY_TOKEN = os.environ.get('OPENCLAW_GATEWAY_TOKEN', '')
OPENCLAW_HOOK_TOKEN = os.environ.get('OPENCLAW_HOOK_TOKEN', '').strip()
BRIDGE_LOG_PATH = os.environ.get('MC_OPENCLAW_BRIDGE_LOG_PATH', '/tmp/mc-openclaw-bridge.log')
workspace_links = {}


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def append_bridge_log(event_type, **fields):
    entry = {
        'ts': utc_now_iso(),
        'event': event_type,
        **fields
    }
    try:
        log_dir = os.path.dirname(BRIDGE_LOG_PATH)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        with open(BRIDGE_LOG_PATH, 'a', encoding='utf-8') as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except Exception:
        pass


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
        for key in ['result', 'data', 'details', 'payloads']:
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


def dispatch_openclaw(agent_id, task_id, prompt, session_key=None, session_id=None, webhook_url=None, webhook_token=None):
    if session_id:
        cmd = [
            'openclaw', 'agent',
            '--agent', agent_id,
            '--session-id', session_id,
            '--message', prompt,
            '--json',
            '--timeout', '120'
        ]
    elif session_key:
        cmd = [
            'openclaw', 'agent',
            '--agent', agent_id,
            '--to', session_key,
            '--message', prompt,
            '--json',
            '--timeout', '120'
        ]
    else:
        raise RuntimeError('Dedicated execution session is required for Mission Control dispatch.')

    try:
        append_bridge_log(
            'openclaw.cli_dispatch',
            agentId=agent_id,
            taskId=task_id,
            sessionKey=session_key,
            sessionId=session_id,
            webhook=bool(webhook_url),
            command=' '.join(cmd)
        )
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=140, check=True)
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or '').strip()
        stdout = (exc.stdout or '').strip()
        message = stderr or stdout or 'OpenClaw dispatch failed.'
        append_bridge_log('openclaw.error', mode='cli', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, message=message)
        raise RuntimeError(message)

    raw = (result.stdout or '').strip()
    start = raw.find('{')
    if start < 0:
        append_bridge_log('openclaw.error', mode='cli', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, message='openclaw agent returned no JSON payload')
        raise RuntimeError('openclaw agent returned no JSON payload')

    payload = json.loads(raw[start:])
    result_payload = payload.get('result') if isinstance(payload, dict) else payload
    final_text = extract_text(result_payload)

    response_id = payload.get('runId') if isinstance(payload, dict) else None
    if not response_id and isinstance(result_payload, dict):
        response_id = result_payload.get('responseId') or result_payload.get('runId') or result_payload.get('id')
        meta = result_payload.get('meta')
        if not response_id and isinstance(meta, dict):
            agent_meta = meta.get('agentMeta')
            if isinstance(agent_meta, dict):
                response_id = agent_meta.get('sessionId')

    if webhook_url:
        callback_payload = {
            'event': 'completed',
            'status': 'completed',
            'taskId': task_id,
            'agentId': agent_id,
            'sessionKey': session_key,
            'sessionId': session_id,
            'resultText': final_text,
            'responseId': response_id,
            'bridgePath': 'cli-session-targeted'
        }
        try:
            headers = {'Content-Type': 'application/json'}
            if webhook_token:
                headers['Authorization'] = f'Bearer {webhook_token}'
            req = Request(webhook_url, data=json.dumps(callback_payload).encode('utf-8'), headers=headers, method='POST')
            with urlopen(req, timeout=20) as resp:
                resp.read()
            append_bridge_log('openclaw.webhook.sent', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, responseId=response_id)
        except HTTPError as e:
            append_bridge_log('openclaw.webhook.error', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, status=e.code)
            raise RuntimeError(f'Mission Control webhook failed ({e.code})')
        except URLError as e:
            append_bridge_log('openclaw.webhook.error', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, message=str(e.reason))
            raise RuntimeError(f'Mission Control webhook failed: {e.reason}')

    append_bridge_log('openclaw.response', mode='cli', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, responseId=response_id, hasFinalText=bool(final_text))
    return {
        'accepted': True,
        'responseId': response_id,
        'finalText': final_text,
        'mode': 'async' if webhook_url else ('async' if not final_text else 'sync'),
        'bridgePath': 'cli-session-targeted',
        'raw': payload
    }


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
            append_bridge_log('bridge.http', method='GET', path=self.path)
            if self.path == '/health':
                return response(self, 200, {'ok': True, 'upstreamBaseUrl': OPENCLAW_BASE_URL, 'hasToken': bool(OPENCLAW_GATEWAY_TOKEN), 'linkedWorkspaces': len(workspace_links), 'logPath': BRIDGE_LOG_PATH})
            if self.path == '/agents':
                bridge_agents = []
                bridge_agent_ids = []
                try:
                    result = openclaw_request('/tools/invoke', {'tool': 'agents_list', 'args': {}})
                    bridge_agents = result.get('result') or []
                    bridge_agent_ids = extract_agent_ids(bridge_agents)
                except Exception:
                    bridge_agents = []
                    bridge_agent_ids = []

                session_agents = []
                try:
                    result = list_sessions_via_cli()
                    session_agent_ids = sorted(set(extract_agent_ids(result)))
                    session_agents = [{'id': agent_id, 'name': agent_id, 'capabilities': ['derived:sessions.list']} for agent_id in session_agent_ids]
                except Exception:
                    session_agents = []

                merged = []
                seen = set()
                for item in (bridge_agents if isinstance(bridge_agents, list) else []):
                    if isinstance(item, str):
                        agent_id = item.strip()
                        if agent_id and agent_id not in seen:
                            seen.add(agent_id)
                            merged.append({'id': agent_id, 'name': agent_id})
                    elif isinstance(item, dict):
                        agent_id = (item.get('id') or item.get('agentId') or item.get('key') or item.get('name') or '').strip() if isinstance((item.get('id') or item.get('agentId') or item.get('key') or item.get('name') or ''), str) else ''
                        if agent_id and agent_id not in seen:
                            seen.add(agent_id)
                            merged.append(item)

                for item in session_agents:
                    agent_id = item.get('id') if isinstance(item, dict) else None
                    if isinstance(agent_id, str) and agent_id not in seen:
                        seen.add(agent_id)
                        merged.append(item)

                append_bridge_log('bridge.agents.result', count=len(merged), bridgeCount=len(bridge_agent_ids), sessionCount=len(session_agents))
                return response(self, 200, {'ok': True, 'result': merged})
            if self.path == '/workspace-links':
                return response(self, 200, {'ok': True, 'result': [{'workspaceId': k, 'agentId': v} for k, v in workspace_links.items()]})
            if self.path == '/logs/recent':
                limit = 200
                try:
                    with open(BRIDGE_LOG_PATH, 'r', encoding='utf-8') as handle:
                        lines = handle.readlines()[-limit:]
                    entries = [json.loads(line) for line in lines if line.strip()]
                except FileNotFoundError:
                    entries = []
                return response(self, 200, {'ok': True, 'result': entries})
            return response(self, 404, {'ok': False, 'error': {'message': 'Not found'}})
        except Exception as e:
            append_bridge_log('bridge.error', method='GET', path=self.path, message=str(e))
            return response(self, 502, {'ok': False, 'error': {'message': str(e)}})

    def do_POST(self):
        try:
            body = parse_json(self)
            append_bridge_log('bridge.http', method='POST', path=self.path, bodyKeys=sorted(list(body.keys())) if isinstance(body, dict) else [])
            if self.path == '/identity/validate':
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
                append_bridge_log('bridge.workspace_linked', workspaceId=workspace_id, agentId=agent_id)
                return response(self, 200, {'ok': True, 'result': {'workspaceId': workspace_id, 'agentId': agent_id}})
            if self.path == '/dispatch':
                agent_id = str(body.get('agentId', '')).strip()
                task_id = str(body.get('taskId', '')).strip()
                prompt = str(body.get('prompt', '')).strip()
                session_key = str(body.get('sessionKey', '')).strip() or None
                session_id = str(body.get('sessionId', '')).strip() or None
                webhook_url = str(body.get('webhookUrl', '')).strip() or None
                webhook_token = str(body.get('webhookToken', '')).strip() or None
                if not agent_id or not task_id or not prompt:
                    return response(self, 422, {'ok': False, 'error': {'message': 'agentId, taskId, and prompt are required.'}})
                if not session_key and not session_id:
                    return response(self, 422, {'ok': False, 'error': {'message': 'sessionKey or sessionId is required for isolated Mission Control dispatch.'}})
                append_bridge_log('bridge.dispatch.request', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, webhook=bool(webhook_url), promptPreview=prompt[:300])
                dispatch = dispatch_openclaw(agent_id, task_id, prompt, session_key=session_key, session_id=session_id, webhook_url=webhook_url, webhook_token=webhook_token)
                append_bridge_log('bridge.dispatch.accepted', agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, responseId=dispatch.get('responseId'), mode=dispatch.get('mode'), bridgePath=dispatch.get('bridgePath'))
                return response(self, 202, {'ok': True, 'accepted': True, 'result': dispatch})
            if self.path == '/workspace-dispatch':
                workspace_id = str(body.get('workspaceId', '')).strip()
                task_id = str(body.get('taskId', '')).strip()
                prompt = str(body.get('prompt', '')).strip()
                session_key = str(body.get('sessionKey', '')).strip() or None
                session_id = str(body.get('sessionId', '')).strip() or None
                webhook_url = str(body.get('webhookUrl', '')).strip() or None
                webhook_token = str(body.get('webhookToken', '')).strip() or None
                if not workspace_id or not task_id or not prompt:
                    return response(self, 422, {'ok': False, 'error': {'message': 'workspaceId, taskId, and prompt are required.'}})
                if not session_key and not session_id:
                    return response(self, 422, {'ok': False, 'error': {'message': 'sessionKey or sessionId is required for isolated Mission Control dispatch.'}})
                agent_id = workspace_links.get(workspace_id)
                if not agent_id:
                    return response(self, 404, {'ok': False, 'error': {'message': f'No linked agent for workspace: {workspace_id}'}})
                append_bridge_log('bridge.workspace_dispatch.request', workspaceId=workspace_id, agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, webhook=bool(webhook_url))
                dispatch = dispatch_openclaw(agent_id, task_id, prompt, session_key=session_key, session_id=session_id, webhook_url=webhook_url, webhook_token=webhook_token)
                append_bridge_log('bridge.workspace_dispatch.accepted', workspaceId=workspace_id, agentId=agent_id, taskId=task_id, sessionKey=session_key, sessionId=session_id, responseId=dispatch.get('responseId'), mode=dispatch.get('mode'), bridgePath=dispatch.get('bridgePath'))
                return response(self, 202, {'ok': True, 'accepted': True, 'result': {'workspaceId': workspace_id, 'agentId': agent_id, 'response': dispatch}})
            return response(self, 404, {'ok': False, 'error': {'message': 'Not found'}})
        except HTTPError as e:
            try:
                payload = json.loads(e.read().decode('utf-8'))
                message = payload.get('error', {}).get('message') or f'OpenClaw request failed ({e.code})'
            except Exception:
                message = f'OpenClaw request failed ({e.code})'
            append_bridge_log('bridge.error', method='POST', path=self.path, status=e.code, message=message)
            return response(self, 502, {'ok': False, 'error': {'message': message}})
        except URLError as e:
            append_bridge_log('bridge.error', method='POST', path=self.path, message=str(e.reason))
            return response(self, 502, {'ok': False, 'error': {'message': str(e.reason)}})
        except Exception as e:
            append_bridge_log('bridge.error', method='POST', path=self.path, message=str(e))
            return response(self, 502, {'ok': False, 'error': {'message': str(e)}})

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(
        f'mc-openclaw-host-bridge listening on :{PORT}, upstream={OPENCLAW_BASE_URL}, '
        f'gatewayToken={bool(OPENCLAW_GATEWAY_TOKEN)}, hookToken={bool(OPENCLAW_HOOK_TOKEN)}, logPath={BRIDGE_LOG_PATH}',
        flush=True
    )
    append_bridge_log('bridge.started', port=PORT, upstream=OPENCLAW_BASE_URL, hasGatewayToken=bool(OPENCLAW_GATEWAY_TOKEN), hasHookToken=bool(OPENCLAW_HOOK_TOKEN))
    server.serve_forever()
