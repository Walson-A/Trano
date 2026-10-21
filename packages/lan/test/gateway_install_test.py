"""Installation input boundaries; no SSH or persistent service is used."""
import ast
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('gateway_install', Path(__file__).resolve().parents[1] / 'scripts/gateway-service-install.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class GatewayInstallTest(unittest.TestCase):
    def config(self, **changes):
        return {'devices': [{'id': 'player', 'name': 'Owned Player', 'kind': 'freebox-player',
                             'host': '192.168.0.30', 'spotifyPort': 56071, 'remoteCode': 'fixture-secret',
                             'samsungToken': 'another-secret', **changes}]}

    def test_bootstrap_selection_excludes_all_control_secrets(self):
        selected = installer.selected_player(self.config())
        self.assertEqual(set(selected), {'id', 'name', 'kind', 'host', 'spotifyPort'})
        self.assertNotIn('fixture-secret', str(selected))
        ast.parse(installer.REMOTE)

    def test_ambiguous_players_and_non_lan_targets_are_refused(self):
        for config in [{'devices': []}, {'devices': self.config()['devices'] * 2}, self.config(host='8.8.8.8'),
                       self.config(host='127.0.0.1'), self.config(spotifyPort=0), self.config(spotifyPort=True)]:
            with self.subTest(config=config), self.assertRaises(ValueError):
                installer.selected_player(config)


if __name__ == '__main__':
    unittest.main()
