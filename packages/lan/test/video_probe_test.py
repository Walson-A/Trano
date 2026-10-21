"""Seek-related HTTP byte ranges for the temporary video fixture."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('devialet_check', Path(__file__).resolve().parents[1] / 'scripts/devialet-check.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class VideoRangeTest(unittest.TestCase):
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
