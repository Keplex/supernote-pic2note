import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setLanguage, t, translateError} from '../src/i18n.ts';
test('language toggle translates controls and nested native errors without losing diagnostics', () => {
  setLanguage('en');
  assert.equal(t('撤销'), 'Undo');
  assert.equal(t('选择最新'), 'Latest image');
  const detail = translateError('无法解码图片，请检查文件是否完整、已解锁且可读取。\n图片解码失败');
  assert.match(detail, /Cannot decode/); assert.match(detail, /Image decoding failed/); assert.doesNotMatch(detail, /[\u4e00-\u9fff]/);
  assert.equal(translateError('E123: vendor error'), 'E123: vendor error');
  setLanguage('zh'); assert.equal(t('撤销'), '撤销');
});
