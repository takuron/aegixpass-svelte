// 可以为 presetManager.ts 创建一个新的测试文件 src/lib/aegixpass/presetManager.spec.ts

import { describe, it, expect } from 'vitest';
import { 
    parseAndValidatePreset, 
    AegixPassError,
    FastHashAlgorithm,
    SlowHashAlgorithm,
    RngAlgorithm
} from '$lib/aegixpass';

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
        { case: '"length" is a string', json: `{"name": "test", "version": 1, "length": "16"}` },
        { case: '"charsets" is not an array', json: `{"name": "test", "version": 1, "length": 16, "charsets": "abc"}` },
    ];

    invalidPresets.forEach(({ case: caseName, json }) => {
        it(`should throw for ${caseName}`, () => {
            expect(() => parseAndValidatePreset(json)).toThrow(AegixPassError);
        });
    });
});


// --- V1 预设验证测试 ---
describe('V1 preset validation', () => {
    const validV1Preset = JSON.stringify({
        name: 'Test-V1',
        version: 1,
        hashAlgorithm: 'sha256',
        rngAlgorithm: 'chaCha20',
        shuffleAlgorithm: 'fisherYates',
        length: 16,
        platformId: 'test.com',
        charsets: ['abc', 'DEF']
    });

    it('should validate a valid V1 preset', () => {
        const preset = parseAndValidatePreset(validV1Preset);
        expect(preset.version).toBe(1);
        expect((preset as any).hashAlgorithm).toBe('sha256');
    });

    const invalidV1Presets = [
        { 
            case: 'invalid hashAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 1,
                hashAlgorithm: 'md5',
                rngAlgorithm: 'chaCha20',
                shuffleAlgorithm: 'fisherYates',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        { 
            case: 'invalid rngAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 1,
                hashAlgorithm: 'sha256',
                rngAlgorithm: 'invalid',
                shuffleAlgorithm: 'fisherYates',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
    ];

    invalidV1Presets.forEach(({ case: caseName, json }) => {
        it(`should throw for V1 preset with ${caseName}`, () => {
            expect(() => parseAndValidatePreset(json)).toThrow(AegixPassError);
        });
    });
});


// --- V2 预设验证测试 ---
describe('V2 preset validation', () => {
    const validV2Preset = JSON.stringify({
        name: 'Test-V2',
        version: 2,
        fastHashAlgorithm: 'sha256',
        slowHashAlgorithm: 'argon2id',
        rngAlgorithm: 'chaCha20',
        length: 16,
        platformId: 'test.com',
        charsets: ['abc', 'DEF']
    });

    it('should validate a valid V2 preset', () => {
        const preset = parseAndValidatePreset(validV2Preset);
        expect(preset.version).toBe(2);
        expect((preset as any).fastHashAlgorithm).toBe('sha256');
        expect((preset as any).slowHashAlgorithm).toBe('argon2id');
        expect((preset as any).hashAlgorithm).toBeUndefined();
        expect((preset as any).shuffleAlgorithm).toBeUndefined();
    });

    const invalidV2Presets = [
        { 
            case: 'missing fastHashAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        { 
            case: 'missing slowHashAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        { 
            case: 'invalid fastHashAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'md5',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        { 
            case: 'invalid slowHashAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'invalid',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        { 
            case: 'invalid rngAlgorithm', 
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'invalid',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        {
            case: 'non-integer length',
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16.5,
                platformId: 'test.com',
                charsets: ['abc']
            })
        },
        {
            case: 'empty platformId',
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: '',
                charsets: ['abc']
            })
        },
        {
            case: 'non-string charset group',
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc', 123]
            })
        },
        {
            case: 'length smaller than charset groups',
            json: JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 1,
                platformId: 'test.com',
                charsets: ['abc', 'DEF']
            })
        },
    ];

    invalidV2Presets.forEach(({ case: caseName, json }) => {
        it(`should throw for V2 preset with ${caseName}`, () => {
            expect(() => parseAndValidatePreset(json)).toThrow(AegixPassError);
        });
    });

    it('should accept all valid V2 fastHashAlgorithm values', () => {
        const algorithms = ['sha256', 'blake3', 'sha3_256'];
        algorithms.forEach(algo => {
            const presetJson = JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: algo,
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            });
            expect(() => parseAndValidatePreset(presetJson)).not.toThrow();
        });
    });

    it('should accept all valid V2 slowHashAlgorithm values', () => {
        const algorithms = ['argon2id', 'scrypt'];
        algorithms.forEach(algo => {
            const presetJson = JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: algo,
                rngAlgorithm: 'chaCha20',
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            });
            expect(() => parseAndValidatePreset(presetJson)).not.toThrow();
        });
    });

    it('should accept all valid V2 rngAlgorithm values', () => {
        const algorithms = ['chaCha20', 'hc128'];
        algorithms.forEach(algo => {
            const presetJson = JSON.stringify({
                name: 'Test',
                version: 2,
                fastHashAlgorithm: 'sha256',
                slowHashAlgorithm: 'argon2id',
                rngAlgorithm: algo,
                length: 16,
                platformId: 'test.com',
                charsets: ['abc']
            });
            expect(() => parseAndValidatePreset(presetJson)).not.toThrow();
        });
    });
});
