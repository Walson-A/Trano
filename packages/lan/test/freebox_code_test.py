"""Loopback setup invariants, using a disposable configuration and synthetic code."""
import http.client
import json
from pathlib import Path
import queue
import subprocess
import sys
import tempfile
import threading
import unittest
from urllib.parse import urlsplit


class CodeSetupTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='trano-code-test-')
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'relay.json'
        self.original = {'allowControl': False, 'token': 'fixture-token', 'devices': [
            {'id': 'devialet', 'kind': 'freebox-player', 'host': '192.168.0.30'},
            {'id': 'other', 'kind': 'samsung', 'host': '192.168.0.31'}]}
        self.path.write_text(json.dumps(self.original), encoding='utf-8')
        script = Path(__file__).resolve().parents[1] / 'scripts/freebox-code-setup.py'
        self.process = subprocess.Popen([sys.executable, '-u', '-B', str(script), str(self.path), 'devialet'],
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(self.stop)
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(self.process.stdout.readline()), daemon=True).start()
        self.first_line = lines.get(timeout=30)
        self.url = urlsplit(json.loads(self.first_line)['localConfigurationUrl'])
        self.origin = 'http://' + self.url.netloc

    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
        self.process.communicate(timeout=10)

    def request(self, method='POST', body='code=12345678', origin=None, host=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.url.port, timeout=5)
        headers = {'Content-Type': 'application/x-www-form-urlencoded',
                   'Host': host or self.url.netloc}
        if origin is not None:
            headers['Origin'] = origin
        connection.request(method, self.url.path + ('/save' if method == 'POST' else ''),
                           body if method == 'POST' else None, headers)
        response = connection.getresponse()
        result = response.status, response.read(), dict(response.getheaders())
        connection.close()
        return result

    def test_reject_untrusted_input_then_save_only_selected_code(self):
        for kwargs, expected in [({}, 403), ({'origin': 'https://untrusted.invalid'}, 403),
                                 ({'origin': self.origin, 'host': 'untrusted.invalid'}, 403),
                                 ({'origin': self.origin, 'body': 'code=bad'}, 400),
                                 ({'origin': self.origin, 'body': 'code=1234&code=5678'}, 400)]:
            with self.subTest(expected=expected, keys=list(kwargs)):
                self.assertEqual(self.request(**kwargs)[0], expected)
                self.assertEqual(json.loads(self.path.read_text(encoding='utf-8')), self.original)
        status, page, headers = self.request(method='GET')
        self.assertEqual(status, 200)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertIn(b'type="password"', page)
        status, page, _ = self.request(origin=self.origin)
        self.assertEqual(status, 200)
        self.assertNotIn(b'12345678', page)
        expected = json.loads(json.dumps(self.original))
        expected['devices'][0]['remoteCode'] = '12345678'
        self.assertEqual(json.loads(self.path.read_text(encoding='utf-8')), expected)
        output, errors = self.process.communicate(timeout=10)
        self.assertEqual(self.process.returncode, 0)
        self.assertNotIn('12345678', self.first_line + output + errors)
        self.assertTrue(json.loads(output)['temporaryServerClosed'])
        self.assertEqual(list(self.path.parent.glob('.freebox-code-*.tmp')), [])

    def test_concurrent_config_edit_is_preserved(self):
        changed = {**self.original, 'port': 4000}
        self.path.write_text(json.dumps(changed), encoding='utf-8')
        self.assertEqual(self.request(origin=self.origin)[0], 409)
        self.assertEqual(json.loads(self.path.read_text(encoding='utf-8')), changed)


if __name__ == '__main__':
    unittest.main()
