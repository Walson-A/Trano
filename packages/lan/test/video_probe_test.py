"""Seek-related HTTP byte ranges for the temporary video fixture."""
import importlib.util
from pathlib import Path
import unittest
import subprocess
import sys

spec = importlib.util.spec_from_file_location('devialet_check', Path(__file__).resolve().parents[1] / 'scripts/devialet-check.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class VideoRangeTest(unittest.TestCase):
    def test_startup_probe_requires_explicit_launch_and_rejects_conflicting_modes(self):
        script = Path(__file__).resolve().parents[1] / 'scripts/devialet-check.py'
        common = [sys.executable, '-B', str(script), '--player', '192.168.50.20', '--bind', '192.168.50.21']
        for arguments, message in [(['--startup-api'], '--launch is required'),
                                   (['--boot-layout'], '--launch is required'),
                                   (['--boot-layout', '--startup-api', '--launch'], 'not allowed with argument'),
                                   (['--startup-api', '--media', '--launch'], 'not allowed with argument')]:
            result = subprocess.run(common + arguments, capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 2)
            self.assertIn(message, result.stderr)

    def test_complete_bounded_open_and_suffix_requests(self):
        for header, expected in [(None, (0, 99, 200)), ('bytes=0-9', (0, 9, 206)),
                                 ('bytes=95-', (95, 99, 206)), ('bytes=-10', (90, 99, 206)),
                                 ('bytes=0-1000', (0, 99, 206)), ('bytes=-1000', (0, 99, 206))]:
            self.assertEqual(probe.video_range(header, 100), expected)

    def test_invalid_or_multiple_ranges_are_refused(self):
        for header in ['bytes=100-', 'bytes=50-49', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'items=0-1']:
            with self.subTest(header=header), self.assertRaises(ValueError):
                probe.video_range(header, 100)


if __name__ == '__main__':
    unittest.main()
