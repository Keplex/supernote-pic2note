import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MIT_LICENSE} from '../src/license.ts';
test('About page license matches the distributed MIT LICENSE', () => {
  assert.equal(MIT_LICENSE, readFileSync(new URL('../LICENSE', import.meta.url), 'utf8').replaceAll('\r\n', '\n'));
});
