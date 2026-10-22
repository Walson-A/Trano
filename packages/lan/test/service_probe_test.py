"""Selected-device boundaries of the read-only service probe, without network I/O."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('service_probe', Path(__file__).resolve().parents[1] / 'scripts/devialet-service-probe.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class Response(io.BytesIO):
    code = 404
    version = 10
    headers = {'Content-Type': 'application/json'}


class ServiceProbeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='trano-service-probe-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = self.root / 'relay.json'
        self.config.write_text(json.dumps({'devices': [{'id': 'owned', 'kind': 'freebox-player',
                'host': '192.168.50.20', 'spotifyPort': 56071, 'remoteCode': 'fixture-private-code'}]}), encoding='utf-8')
        self.arguments = ['probe', str(self.config), 'owned', '--output', str(self.root / 'evidence')]

    def invoke(self, arguments, opener=None):
        with patch.object(sys, 'argv', self.arguments + arguments), contextlib.redirect_stdout(io.StringIO()), \
             contextlib.redirect_stderr(io.StringIO()), patch.object(probe.urllib.request, 'build_opener', return_value=opener), \
             patch.object(probe.socket, 'create_connection') as connect:
            try:
                probe.main()
                return connect.call_count
            finally:
                self.last_connection_count = connect.call_count

    def test_inspect_flag_is_required_before_any_network_or_config_read(self):
        self.config.unlink()
        with self.assertRaises(SystemExit) as error:
            self.invoke([])
        self.assertEqual(error.exception.code, 2)

    def test_identity_mismatch_prevents_tcp_and_api_probes(self):
        class Opener:
            calls = 0
            def open(self, *_args, **_kwargs):
                self.calls += 1
                return Response(b'{"status":101,"brandDisplayName":"Other"}')
        opener = Opener()
        with self.assertRaisesRegex(RuntimeError, 'identity'):
            self.invoke(['--inspect'], opener)
        self.assertEqual(opener.calls, 1)
        self.assertEqual(self.last_connection_count, 0)

    def test_alternate_http_is_get_only_and_evidence_excludes_control_code(self):
        class Opener:
            def __init__(self): self.calls = []
            def open(self, request, **_kwargs):
                if isinstance(request, str):
                    return Response(b'{"status":101,"brandDisplayName":"Freebox","modelDisplayName":"Freebox v7"}')
                self.calls.append((request.method, request.full_url))
                return Response(b'{"error":"fixture"}')
        opener = Opener()
        self.assertEqual(self.invoke(['--inspect', '--http-port', '8080'], opener), 0)
        self.assertEqual(opener.calls, [('GET', 'http://192.168.50.20:8080/'),
                                       ('GET', 'http://192.168.50.20:8080/api_version')])
        text = (self.root / 'evidence/http.har').read_text(encoding='utf-8')
        self.assertNotIn('fixture-private-code', text)
        self.assertTrue(all(x['response']['httpVersion'] == 'HTTP/1.0' for x in json.loads(text)['log']['entries']))


if __name__ == '__main__':
    unittest.main()
