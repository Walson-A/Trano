"""Build the live QML bundle for the existing closed Atlas TV gateway, no secrets/data."""
import argparse
import hashlib
import json
import pathlib
import shutil


def build(destination, regular, bold):
    source = pathlib.Path(__file__).resolve().parent.parent / 'devialet/hero'
    if destination.exists():
        raise ValueError('Choose a new output directory')
    fonts = {}
    for name, path in [('regular.ttf', regular), ('bold.ttf', bold)]:
        data = path.read_bytes()
        if not 0 < len(data) <= 2*1024*1024 or data[:4] not in (b'\x00\x01\x00\x00', b'OTTO'):
            raise ValueError('An explicit TrueType/OpenType font is required')
        fonts[name] = data
    destination.mkdir(parents=True)
    for name in ['Hero.qml', 'HeroButton.qml', 'FocusCard.qml', 'HeroArtwork.qml', 'Icon.qml',
                 'Motion.js', 'Trailer.qml', 'TvSession.qml', 'EpisodePlayer.qml', 'live.qml', 'qmldir']:
        shutil.copyfile(source / name, destination / name)
    # The gateway deliberately accepts flat, allowlisted filenames only.
    icon = destination / 'Icon.qml'
    icon.write_text(icon.read_text(encoding='utf-8').replace("'icons/'", "'icon-'"), encoding='utf-8')
    for name in ['play', 'info', 'volume-2', 'volume-x']:
        shutil.copyfile(source / 'icons' / (name+'.svg'), destination / ('icon-'+name+'.svg'))
    shutil.copyfile(source / 'icons/LICENSE', destination / 'ICON-LICENSE.txt')
    shutil.copyfile(source / 'FONT-LICENSE.txt', destination / 'FONT-LICENSE.txt')
    for name, data in fonts.items():
        (destination / name).write_bytes(data)
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    manifest['description'] = 'Atlas TV : catalogue et lecture depuis le serveur'
    manifest['entryPoints']['main']['file'] = 'live.qml'
    (destination / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
    # No bench host/session.json, local media, accounts or fixture is distributed.
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(destination.iterdir())}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    parser.add_argument('--regular', type=pathlib.Path, required=True)
    parser.add_argument('--bold', type=pathlib.Path, required=True)
    args = parser.parse_args()
    print(json.dumps({'files': build(args.output, args.regular, args.bold)}, indent=2))
