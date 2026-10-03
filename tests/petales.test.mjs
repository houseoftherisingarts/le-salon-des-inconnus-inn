// node tests/petales.test.mjs  (Node 22.18+ lit le .ts directement)
import assert from 'node:assert/strict';
import { petalesPourPartie as p } from '../utils/petales.ts';

const m = (o) => ({ type: 'paisho:partie', gagnee: false, contre: 'maison', niveau: 5, ...o });
assert.equal(p(m({})), 20);
assert.equal(p(m({ gagnee: true })), 60);
assert.equal(p(m({ gagnee: true, niveau: 10 })), 120);
assert.equal(p(m({ niveau: 3 })), 12);
assert.equal(p(m({ niveau: 99 })), 40);
assert.equal(p(m({ contre: 'deux', gagnee: true })), 0);
assert.equal(p(m({ contre: 'distance', gagnee: true })), 20);
assert.equal(p({ type: 'autre' }), 0);
assert.equal(p(null), 0);
console.log('petales : ok');
