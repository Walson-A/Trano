const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const qml = fs.readFileSync(path.join(__dirname, '../devialet/hero/TvSession.qml'), 'utf8');
const requests = [];
const old = { hero: [], rangees: [{ id: 'reprendre', episode: 3 }] };
const next = { hero: [], rangees: [{ id: 'reprendre', episode: 4 }] };
const state = {
    home: old, homeGeneration: 0, homeRefreshing: false,
    homeRefreshAllowed: true, state: 'ready', accessToken: 'fixture',
    api: (route, body, timeout, done) => requests.push({ route, done }),
    homeUpdating: () => assert.equal(state.home, old),
    homeLoaded: () => assert.equal(state.home, next),
};
vm.createContext(state);
vm.runInContext(qml.slice(qml.indexOf('    function applyHome('), qml.indexOf('    function mediaUrl(')), state);

state.loadHome(true);
state.loadHome(true);
assert.equal(requests.length, 1);
requests.shift().done(503, null);
assert.equal(state.state, 'ready');
assert.equal(state.home, old);

state.loadHome(true);
requests.shift().done(200, { ...next, complements_a_charger: true });
state.loadHome(true);
assert.equal(requests.length, 1);
assert.match(requests[0].route, /home-extras$/);
assert.equal(state.home, old);
state.homeRefreshAllowed = false;
requests.shift().done(200, next);
assert.equal(state.home, old);
state.loadHome(true);
assert.equal(requests.length, 0);

state.homeRefreshAllowed = true;
state.loadHome(true);
requests.shift().done(200, next);
assert.equal(state.home, next);
state.loadHome(true);
requests.shift().done(200, { ...next });
assert.equal(state.home, next);
console.log('Home refresh preserves the current catalogue during errors and playback, and applies fresh progress once.');
