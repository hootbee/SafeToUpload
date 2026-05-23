#!/usr/bin/env python3
"""Gemma4 26B AI 서버 개발용 mock. Nest AI_SERVER_URL=http://localhost:8000 로 연결."""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/v1/analyze':
            self.send_error(404)
            return

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length) or b'{}')
        text = body.get('inputText') or ''
        has_text = len(text.strip()) > 0

        payload = {
            'riskScore': 76 if has_text else 42,
            'riskLevel': 'high' if has_text else 'medium',
            'piiItems': [
                {
                    'type': 'phone',
                    'label': '전화번호',
                    'text': '010-0000-0000',
                    'severity': 'high',
                    'description': '서버 mock 탐지',
                    'location': '본문',
                    'policyRef': '개인 연락처 비공개',
                }
            ],
            'exifItems': [],
            'imageRisks': [],
            'contextResult': {
                'summary': '서버 Gemma4 26B mock 분석이 완료되었습니다.',
                'platformContext': body.get('platform', 'unknown'),
            },
            'rewriteSuggestion': '식별 가능한 연락처와 주소를 제거한 문장으로 수정하세요.',
            'rawAiResponse': {'mode': 'python-mock', 'model': body.get('model', 'gemma-4-26b')},
        }

        data = json.dumps(payload).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 8000), Handler).serve_forever()
