// 可以为 presetManager.ts 创建一个新的测试文件 src/lib/aegixpass/presetManager.spec.ts

import { describe, it, expect } from 'vitest';
import { parseAndValidatePreset, AegixPassError } from '$lib/aegixpass';

describe('parseAndValidatePreset edge cases', () => {

    // --- 无效的 JSON 字符串 ---
    it('should throw when parsing malformed JSON string', () => {
        const invalidJson = '{"name": "test",}'; // 多了一个逗号
        expect(() => parseAndValidatePreset(invalidJson)).toThrow('Failed to parse JSON string.');
    });

    // --- 字段缺失或类型错误的 JSON ---
    const invalidPresets = [
        { case: 'missing "version"', json: `{"name": "test"}` },
        { case: 'missing "name"', json: `{"version": 1}` },
        { case: 'unsupported version', json: `{"name": "test", "version": 2}` },
        { case: '"length" is a string', json: `{"name": "test", "version": 1, "length": "16"}` },
        { case: '"charsets" is not an array', json: `{"name": "test", "version": 1, "length": 16, "charsets": "abc"}` },
        { case: 'invalid "hashAlgorithm"', json: `{"name": "test", "version": 1, "hashAlgorithm": "md5"}` }
    ];

    invalidPresets.forEach(({ case: caseName, json }) => {
        it(`should throw for ${caseName}`, () => {
            // 使用 expect.toThrow() 来断言函数是否按预期抛出了 AegixPassError
            expect(() => parseAndValidatePreset(json)).toThrow(AegixPassError);
        });
    });
});