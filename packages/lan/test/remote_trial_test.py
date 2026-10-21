"""Offline failure injection for the remote trial. No SSH, Docker or device I/O."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import signal
import socket
import ssl
import subprocess
import sys
import tarfile
import time
import unittest
from unittest import mock
import urllib.error
import urllib.request

SCRIPT = Path(__file__).parents[1] / 'scripts' / 'remote-devialet-trial.py'
spec = importlib.util.spec_from_file_location('remote_trial', SCRIPT)
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)
BASE = {'TCP': {'443': {'HTTPS': True}}, 'Web': {'server.tail.ts.net:443': {'Handlers': {'/': {'Proxy': 'http://127.0.0.1:7777'}}}}}
DEVICE = {'id': 'tv', 'name': 'TV', 'kind': 'samsung', 'host': '192.168.50.10', 'mac': 'aa:bb:cc:dd:ee:ff'}
ROW = {'id': 'tv', 'model': 'FixtureTV', 'reachable': True, 'state': {'volume': 0, 'muted': False, 'playback': 'unknown'}, 'capabilities': []}


def simulate(mode='success'):
    archive = io.BytesIO()
    data = json.dumps({'publicBaseUrl': 'https://server.tail.ts.net:8443', 'wsVersion': '8.22.0', 'devices': [DEVICE], 'dockerFunnelAdmin': mode.startswith('docker_'), 'publicDnsWaitSeconds': 30 if mode.startswith(('dns_', 'https_')) else 0, 'restartGateway': mode.startswith('restart_')}).encode()
    with tarfile.open(fileobj=archive, mode='w:gz') as bundle:
        member = tarfile.TarInfo('setup.json')
        member.size = len(data)
        bundle.addfile(member, io.BytesIO(data))
    clock = [0]
    state = json.loads(json.dumps(BASE))
    commands = []
    published = [False]
    restarted_at = [None]
    container = [False]
    output = io.StringIO()
    error = None
    namespace = {}

    def check_output(command, **_):
        if mode == 'status_cleanup_failure' and published[0]:
            raise subprocess.TimeoutExpired(command, 8)
        return json.dumps(state)

    def run(command, **_):
        commands.append(command)
        stdout = ''
        if command[:2] == ['docker', 'inspect']:
            stdout = 'sha256:' + 'd' * 64
        elif command[:2] == ['docker', 'run'] and 'funnel' not in command:
            container[0] = True
        elif command[:2] == ['docker', 'exec']:
            stdout = '8.22.0'
        elif command[:2] == ['docker', 'restart']:
            restarted_at[0] = clock[0]
        elif command[:2] == ['docker', 'rm']:
            container[0] = False
        elif command[:2] == ['docker', 'ps']:
            stdout = '' if not container[0] else 'trial-still-running'
        elif command[:2] == ['tailscale', 'funnel'] or (command[:2] == ['docker', 'run'] and 'funnel' in command):
            if 'off' in command:
                if mode in ('funnel_cleanup_failure', 'docker_funnel_cleanup_failure'):
                    raise subprocess.TimeoutExpired(command, 15)
                state['TCP'].pop('8443', None)
                state['Web'].pop('server.tail.ts.net:8443', None)
                state['AllowFunnel'] = {}
            else:
                published[0] = True
                state['TCP']['8443'] = {'HTTPS': True}
                state['Web']['server.tail.ts.net:8443'] = {'Handlers': {'/': {'Proxy': 'http://127.0.0.1:3014'}}}
                state['AllowFunnel'] = {'server.tail.ts.net:8443': True}
        else:
            raise AssertionError('Unexpected simulated command')
        return subprocess.CompletedProcess(command, 0, stdout, '')

    class Opener:
        def open(self, request, **_):
            if isinstance(request, str) and request.startswith('https://dns.google/'):
                answer = [{'type': 1, 'data': '203.0.113.1'}] if mode == 'dns_missing' else [{'type': 1, 'data': '8.8.8.8'}]
                return io.BytesIO(json.dumps({'Answer': answer}).encode())
            if isinstance(request, str):
                raise urllib.error.HTTPError(request, 404, 'fixture', None, None)
            stop = 8 if mode == 'early_disconnect' else 60
            if mode != 'never_disconnect' and clock[0] >= stop:
                raise urllib.error.HTTPError(request.full_url, 503, 'fixture', None, None)
            if restarted_at[0] is not None:
                elapsed = clock[0] - restarted_at[0]
                if elapsed < 2:
                    raise OSError('fixture gateway restarting')
                if elapsed < 5 or mode == 'restart_missing':
                    raise urllib.error.HTTPError(request.full_url, 503, 'fixture', None, None)
            row = dict(ROW, reachable=mode != 'unreachable' and not (mode == 'restart_unreachable' and restarted_at[0] is not None))
            return io.BytesIO(json.dumps({'controlEnabled': False, 'devices': [row]}).encode())

    with contextlib.ExitStack() as stack:
        stack.enter_context(contextlib.redirect_stdout(output))
        stack.enter_context(mock.patch.object(sys, 'stdin', type('Input', (), {'buffer': io.BytesIO(archive.getvalue())})()))
        stack.enter_context(mock.patch.object(signal, 'SIGHUP', 1, create=True))
        stack.enter_context(mock.patch.object(signal, 'signal'))
        stack.enter_context(mock.patch.object(os, 'getuid', return_value=1000, create=True))
        stack.enter_context(mock.patch.object(os, 'getgid', return_value=1000, create=True))
        stack.enter_context(mock.patch.object(socket, 'socket'))
        stack.enter_context(mock.patch.object(socket, 'create_connection'))
        ssl_context = stack.enter_context(mock.patch.object(ssl, 'create_default_context'))
        ssl_context.return_value.wrap_socket.return_value.__enter__.return_value.recv.return_value = b'HTTP/1.1 503 Not Ready\r\n' if mode == 'https_missing' else b'HTTP/1.1 404 Not Found\r\n'
        stack.enter_context(mock.patch.object(subprocess, 'check_output', side_effect=check_output))
        stack.enter_context(mock.patch.object(subprocess, 'run', side_effect=run))
        stack.enter_context(mock.patch.object(urllib.request, 'build_opener', return_value=Opener()))
        stack.enter_context(mock.patch.object(time, 'monotonic', side_effect=lambda: clock[0]))
        stack.enter_context(mock.patch.object(time, 'sleep', side_effect=lambda seconds: clock.__setitem__(0, clock[0] + seconds)))
        try:
            exec(compile(trial.REMOTE, '<remote-trial-simulation>', 'exec'), namespace)
        except RuntimeError as exception:
            error = str(exception)
    reports = [json.loads(line) for line in output.getvalue().splitlines()]
    # Never allow the secret bootstrap URL into assertion diffs.
    for report in reports:
        report.pop('bootstrapUrl', None)
    if namespace.get('root') and namespace['root'].exists():
        raise AssertionError('Temporary directory was left behind')
    return reports, error, commands


class RemoteTrialTests(unittest.TestCase):
    def test_full_trial_reports_verified_cleanup(self):
        reports, error, _ = simulate()
        self.assertIsNone(error)
        trial.verify_trial_reports(reports, 0, None, ['tv'])

    def test_player_recovers_after_only_the_trial_gateway_is_restarted(self):
        reports, error, commands = simulate('restart_success')
        self.assertIsNone(error)
        trial.verify_trial_reports(reports, 0, None, ['tv'], expected_restart=True)
        restarts = [cmd for cmd in commands if cmd[:2] == ['docker', 'restart']]
        self.assertEqual(len(restarts), 1)
        self.assertTrue(restarts[0][-1].startswith('trano-devialet-trial-'))
        self.assertNotEqual(restarts[0][-1], 'trano')
        self.assertTrue(any(row.get('remoteWssRecovered') and 'devices' in row for row in reports))

    def test_missing_player_recovery_fails_and_cleans_up(self):
        reports, error, _ = simulate('restart_missing')
        self.assertIn('did not reconnect', error)
        self.assertTrue(reports[-1]['trialFunnelRemoved'])
        self.assertTrue(reports[-1]['temporaryContainerRemoved'])
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports, 0, None, ['tv'], expected_restart=True)

    def test_unidentified_recovered_devices_do_not_prove_recovery(self):
        reports, error, _ = simulate('restart_unreachable')
        self.assertIsNotNone(error)
        self.assertFalse(any(row.get('remoteWssRecovered') and 'devices' in row for row in reports))

    def test_restart_mode_requires_separate_recovery_evidence(self):
        reports, _, _ = simulate()
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports, 0, None, ['tv'], expected_restart=True)
        reports, _, _ = simulate('restart_success')
        recovery = next(row for row in reports if row.get('remoteWssRecovered') and 'devices' in row)
        recovery['devices'][0]['reachable'] = False
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports, 0, None, ['tv'], expected_restart=True)

    def test_public_dns_is_required_before_player_launch_is_offered(self):
        reports, error, _ = simulate('dns_missing')
        self.assertIsNotNone(error)
        self.assertFalse(any(row.get('publicTrialReady') for row in reports))
        self.assertTrue(reports[-1]['trialFunnelRemoved'])
        self.assertTrue(reports[-1]['temporaryFilesRemoved'])

    def test_public_dns_without_https_never_offers_a_player_launch(self):
        reports, error, _ = simulate('https_missing')
        self.assertIsNotNone(error)
        self.assertTrue(any(row.get('publicDnsReady') for row in reports))
        self.assertFalse(any(row.get('publicTrialReady') for row in reports))
        self.assertTrue(reports[-1]['trialFunnelRemoved'])

    def test_public_dns_readiness_allows_the_trial(self):
        reports, error, _ = simulate('dns_ready')
        self.assertIsNone(error)
        self.assertTrue(any(row.get('publicDnsReady') for row in reports))
        trial.verify_trial_reports(reports, 0, None, ['tv'])

    def test_docker_admin_helper_is_bounded_and_temporary(self):
        reports, error, commands = simulate('docker_success')
        self.assertIsNone(error)
        trial.verify_trial_reports(reports, 0, None, ['tv'])
        helpers = [cmd for cmd in commands if cmd[:2] == ['docker', 'run'] and 'funnel' in cmd]
        self.assertEqual(len(helpers), 2)
        for cmd in helpers:
            self.assertIn('--rm', cmd)
            self.assertIn('none', cmd)
            self.assertIn('--read-only', cmd)
            self.assertNotIn('--privileged', cmd)
        self.assertEqual(helpers[0][-4:], ['funnel', '--bg', '--https=8443', 'http://127.0.0.1:3014'])
        self.assertEqual(helpers[1][-3:], ['funnel', '--https=8443', 'off'])
        self.assertTrue(any(cmd[:3] == ['docker', 'rm', '-f'] and cmd[-1].endswith('-funnel') for cmd in commands))

    def test_docker_helper_failure_does_not_skip_independent_cleanup(self):
        reports, error, _ = simulate('docker_funnel_cleanup_failure')
        self.assertIsNotNone(error)
        self.assertFalse(reports[-1]['trialFunnelRemoved'])
        self.assertTrue(reports[-1]['temporaryContainerRemoved'])
        self.assertTrue(reports[-1]['temporaryFilesRemoved'])

    def test_funnel_cleanup_failure_still_removes_container_and_files(self):
        reports, error, commands = simulate('funnel_cleanup_failure')
        self.assertIsNotNone(error)
        self.assertTrue(reports[-1]['temporaryContainerRemoved'])
        self.assertTrue(reports[-1]['temporaryFilesRemoved'])
        self.assertFalse(reports[-1]['trialFunnelRemoved'])
        self.assertTrue(any(cmd[:2] == ['docker', 'rm'] for cmd in commands))
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports, 0, None, ['tv'])

    def test_unreadable_funnel_status_does_not_skip_other_cleanup(self):
        reports, error, _ = simulate('status_cleanup_failure')
        self.assertIsNotNone(error)
        self.assertTrue(reports[-1]['temporaryContainerRemoved'])
        self.assertTrue(reports[-1]['temporaryFilesRemoved'])
        self.assertIsNone(reports[-1]['existingHttps443Unchanged'])

    def test_unreachable_devices_do_not_prove_a_complete_trial(self):
        reports, error, _ = simulate('unreachable')
        self.assertIsNotNone(error)
        self.assertFalse(any(report.get('remoteWssInventory') for report in reports))

    def test_missing_timed_exit_is_failure(self):
        reports, error, _ = simulate('never_disconnect')
        self.assertIsNotNone(error)
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports, 0, None, ['tv'])

    def test_early_network_loss_is_not_a_successful_timed_exit(self):
        reports, error, _ = simulate('early_disconnect')
        self.assertIn('before the expected', error)

    def test_missing_or_false_cleanup_fields_fail_even_with_zero_ssh_exit(self):
        reports, _, _ = simulate()
        for field in ('trialFunnelRemoved', 'temporaryContainerRemoved', 'temporaryFilesRemoved', 'existingHttps443Unchanged'):
            broken = [dict(row) for row in reports]
            broken[-1][field] = False
            with self.assertRaises(RuntimeError):
                trial.verify_trial_reports(broken, 0, None, ['tv'])
        with self.assertRaises(RuntimeError):
            trial.verify_trial_reports(reports[:-1], 0, None, ['tv'])


if __name__ == '__main__':
    unittest.main()
