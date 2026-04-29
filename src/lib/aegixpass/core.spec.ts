// src/lib/aegixpass/core.spec.ts

// 1. 从 vitest 导入测试所需的函数
import {describe, expect, it} from 'vitest';

// 2. 导入我们要测试的目标函数，以及新的预设加载函数
import {
    AegixPassError,
    aegixPassGenerator,
    HashAlgorithm,
    FastHashAlgorithm,
    SlowHashAlgorithm,
    loadBuiltInPresets,
    loadBuiltInPresetsV1,
    loadBuiltInPresetsV2,
    type Preset,
    type PresetV1,
    type PresetV2,
    RngAlgorithm,
    ShuffleAlgorithm
} from '$lib/aegixpass'


// --- V1 算法测试（向后兼容性） ---
describe('V1 Algorithm - Backward Compatibility', () => {
    // --- 准备工作 ---
    const masterPassword = 'MySecretPassword123!';
    const distinguishKey = 'example.com';

    // 加载 V1 预设
    const allPresetsV1 = loadBuiltInPresetsV1();

    // V1 测试用例的预期密码
    const testCasesV1 = [
        {
            presetName: 'AegixPass - Default',
            expectedPassword: '0+JkyL%LQ3wNIP8p',
        },
        {
            presetName: 'AegixPass - NoSymbol',
            expectedPassword: 'uu2QHYLfD2c1SWi9',
        },
        {
            presetName: 'AegixPass - Pin',
            expectedPassword: '174520',
        },
        {
            presetName: 'AegixPass - Short',
            expectedPassword: 'W6=Qt$29L=',
        },
        {
            presetName: 'AegixPass - Short|NoSymbol',
            expectedPassword: 'Ue6WrGNpIY',
        },
        {
            presetName: 'AegixPass - Sha256',
            expectedPassword: 'tK2Vj^W&E-YVByG7',
        },
        {
            presetName: 'AegixPass - Long',
            expectedPassword: '+ifQgVimVKCD_WM%ZqP&W+-nsYu2wEH6',
        },
        {
            presetName: 'AegixPass - Long|NoSymbol',
            expectedPassword: 'ab8H8INYohXlKvnfwv4jn4WmRYu8MNaq',
        },
    ];

    it.each(testCasesV1)('should correctly generate password for V1 preset: $presetName', async ({
                                                                                                presetName,
                                                                                                expectedPassword
                                                                                            }) => {
        const preset = allPresetsV1.find(p => p.name === presetName);
        expect(preset, `Preset named "${presetName}" should exist.`).toBeDefined();

        const generatedPassword = await aegixPassGenerator(
            masterPassword,
            distinguishKey,
            preset as PresetV1
        );

        expect(generatedPassword).toBe(expectedPassword);
    });

    it('should maintain determinism with V1 presets', async () => {
        const preset = allPresetsV1.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const pass1 = await aegixPassGenerator(masterPassword, distinguishKey, preset as PresetV1);
        const pass2 = await aegixPassGenerator(masterPassword, distinguishKey, preset as PresetV1);
        expect(pass1).toBe(pass2);
    });

    it('should maintain uniqueness with V1 presets', async () => {
        const preset = allPresetsV1.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const pass1 = await aegixPassGenerator(masterPassword, 'example.com', preset as PresetV1);
        const pass2 = await aegixPassGenerator(masterPassword, 'anothersite.org', preset as PresetV1);
        expect(pass1).not.toBe(pass2);
    });
});


// --- V2 算法测试 ---
describe('V2 Algorithm', () => {
    const masterPassword = 'MySecretPassword123!';
    const distinguishKey = 'example.com';

    // 加载 V2 预设
    const allPresetsV2 = loadBuiltInPresetsV2();

    it('should load V2 presets correctly', () => {
        expect(allPresetsV2.length).toBeGreaterThan(0);
        allPresetsV2.forEach(preset => {
            expect(preset.version).toBe(2);
            expect(preset.fastHashAlgorithm).toBeDefined();
            expect(preset.slowHashAlgorithm).toBeDefined();
            expect((preset as any).hashAlgorithm).toBeUndefined();
            expect((preset as any).shuffleAlgorithm).toBeUndefined();
        });
    });

    it('should maintain determinism with V2 presets', async () => {
        const preset = allPresetsV2.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const pass1 = await aegixPassGenerator(masterPassword, distinguishKey, preset as PresetV2);
        const pass2 = await aegixPassGenerator(masterPassword, distinguishKey, preset as PresetV2);
        expect(pass1).toBe(pass2);
    });

    it('should maintain uniqueness with V2 presets', async () => {
        const preset = allPresetsV2.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const pass1 = await aegixPassGenerator(masterPassword, 'example.com', preset as PresetV2);
        const pass2 = await aegixPassGenerator(masterPassword, 'anothersite.org', preset as PresetV2);
        expect(pass1).not.toBe(pass2);
    });

    it('should generate different passwords for V1 and V2 with same input', async () => {
        const presetV1 = loadBuiltInPresetsV1().find(p => p.name === 'AegixPass - Default');
        const presetV2 = loadBuiltInPresetsV2().find(p => p.name === 'AegixPass - Default');
        expect(presetV1).toBeDefined();
        expect(presetV2).toBeDefined();

        const passV1 = await aegixPassGenerator(masterPassword, distinguishKey, presetV1 as PresetV1);
        const passV2 = await aegixPassGenerator(masterPassword, distinguishKey, presetV2 as PresetV2);
        
        expect(passV1).not.toBe(passV2);
    });

    it('should ensure all charsets are used in V2', async () => {
        const preset = allPresetsV2.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const password = await aegixPassGenerator(
            'a-very-long-and-random-password',
            'a-very-long-key',
            preset as PresetV2
        );

        for (const charset of (preset as PresetV2).charsets) {
            const hasCharFromCharset = Array.from(charset).some(c => password.includes(c));
            expect(hasCharFromCharset).toBe(true);
        }
    });

    it('should match the V2 default test vector', async () => {
        const preset = allPresetsV2.find(p => p.name === 'AegixPass - Default');
        expect(preset).toBeDefined();

        const password = await aegixPassGenerator(masterPassword, distinguishKey, preset as PresetV2);

        expect(password).toBe('7Y8BWW3i!l2JTcPP');
    });

    it('should treat Unicode charset characters as code points', async () => {
        const unicodePreset: PresetV2 = {
            name: 'Unicode-Vector',
            version: 2,
            fastHashAlgorithm: FastHashAlgorithm.Sha256,
            slowHashAlgorithm: SlowHashAlgorithm.Argon2id,
            rngAlgorithm: RngAlgorithm.ChaCha20,
            length: 12,
            platformId: 'aegixpass.takuron.com',
            charsets: ['你好', '🚀🌙', 'AB']
        };

        const password = await aegixPassGenerator('密码🔑123', '测试网站.com 😊', unicodePreset);

        expect(Array.from(password)).toHaveLength(unicodePreset.length);
        expect(password).toBe('🚀好🚀B好好你B🚀🚀🚀🌙');
    });

    it('should generate passwords beyond the first ChaCha20 buffer', async () => {
        const preset = allPresetsV2.find(p => p.name === 'AegixPass - Default') as PresetV2;
        const longPreset: PresetV2 = {...preset, name: 'Long-Vector', length: 1100, charsets: ['a', 'B', '3', '!']};

        const password = await aegixPassGenerator('long master', 'long site', longPreset);

        expect(password).toHaveLength(longPreset.length);
        expect(password.slice(0, 64)).toBe('B!!B3!B3aBaa!!a!!B3B!3aB!aaB!3a!a!3aBB33B!3!a3!!!BBBaBBaaaa3a!aB');
    });

    it('should handle different fast hash algorithms in V2', async () => {
        const basicPreset: PresetV2 = {
            name: 'Test-V2-Sha256',
            version: 2,
            fastHashAlgorithm: FastHashAlgorithm.Sha256,
            slowHashAlgorithm: SlowHashAlgorithm.Argon2id,
            rngAlgorithm: RngAlgorithm.ChaCha20,
            length: 16,
            platformId: 'aegixpass.takuron.com',
            charsets: [
                '0123456789',
                'abcdefghijklmnopqrstuvwxyz',
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                '!@#$%^&*_+-='
            ]
        };

        const pass1 = await aegixPassGenerator(masterPassword, distinguishKey, basicPreset);
        expect(pass1).toBeDefined();
        expect(pass1.length).toBe(16);

        const pass2 = await aegixPassGenerator(masterPassword, distinguishKey, {
            ...basicPreset,
            fastHashAlgorithm: FastHashAlgorithm.Sha3_256
        });
        expect(pass2).not.toBe(pass1);
    });
});


// --- 通用边界情况测试 ---
describe('aegixPassGenerator with edge case inputs', () => {
    const basicPresetV2: PresetV2 = {
        name: 'Test-Basic-V2',
        version: 2,
        fastHashAlgorithm: FastHashAlgorithm.Sha256,
        slowHashAlgorithm: SlowHashAlgorithm.Argon2id,
        rngAlgorithm: RngAlgorithm.ChaCha20,
        length: 4,
        platformId: 'aegixpass.takuron.com',
        charsets: ['a', 'b', 'c', 'd']
    };

    const edgeCaseInputs = [
        {
            caseName: 'should handle inputs with only whitespace',
            masterPassword: '   ',
            distinguishKey: ' ',
            expectedToThrow: false
        },
        {
            caseName: 'should handle inputs with Unicode and Emojis',
            masterPassword: '密码🔑123',
            distinguishKey: '测试网站.com 😊',
            expectedToThrow: false
        },
        {
            caseName: 'should handle very long inputs',
            masterPassword: 'a'.repeat(1000),
            distinguishKey: 'b'.repeat(1000),
            expectedToThrow: false
        },
        {
            caseName: 'should work when password length equals the number of charsets',
            preset: {...basicPresetV2, length: 4},
            expectedToThrow: false
        },
        {
            caseName: 'should handle duplicate characters within charsets',
            preset: {...basicPresetV2, length: 10, charsets: ['aabc', 'ddee', 'ffgg']},
            expectedToThrow: false
        },
        {
            caseName: 'should handle Unicode characters in charsets',
            preset: {...basicPresetV2, length: 10, charsets: ['你好', '🚀', 'AB']},
            expectedToThrow: false
        }
    ];

    edgeCaseInputs.forEach(({
                                caseName,
                                masterPassword = 'default',
                                distinguishKey = 'default',
                                preset = basicPresetV2,
                                expectedToThrow
                            }) => {
        it(caseName, async () => {
            if (expectedToThrow) {
                await expect(
                    aegixPassGenerator(masterPassword, distinguishKey, preset)
                ).rejects.toThrow(AegixPassError);
            } else {
                const password = await aegixPassGenerator(masterPassword, distinguishKey, preset);
                expect(password).toBeDefined();
                expect(typeof password).toBe('string');
                if (preset.length) {
                    expect(Array.from(password)).toHaveLength(preset.length);
                }
            }
        });
    });
});


// --- 输入验证测试 ---
describe('aegixPassGenerator input validation', () => {
    const validPresetV2: PresetV2 = {
        name: 'Test-Basic-V2',
        version: 2,
        fastHashAlgorithm: FastHashAlgorithm.Sha256,
        slowHashAlgorithm: SlowHashAlgorithm.Argon2id,
        rngAlgorithm: RngAlgorithm.ChaCha20,
        length: 4,
        platformId: 'aegixpass.takuron.com',
        charsets: ['a', 'b', 'c', 'd']
    };

    it('should throw if master password is empty', async () => {
        await expect(
            aegixPassGenerator('', 'example.com', validPresetV2)
        ).rejects.toThrow('Master password');
    });

    it('should throw if distinguish key is empty', async () => {
        await expect(
            aegixPassGenerator('password', '', validPresetV2)
        ).rejects.toThrow('Master password');
    });

    it('should throw if password length is less than number of charsets', async () => {
        const presetWithShortLength = {...validPresetV2, length: 2, charsets: ['a', 'b', 'c']};
        await expect(
            aegixPassGenerator('password', 'example.com', presetWithShortLength)
        ).rejects.toThrow(/Password length/);
    });

    it('should throw if a charset group is empty', async () => {
        const presetWithEmptyCharset = {...validPresetV2, charsets: ['a', 'b', '']};
        await expect(
            aegixPassGenerator('password', 'example.com', presetWithEmptyCharset)
        ).rejects.toThrow('All charset groups');
    });

    it('should throw for unsupported version', async () => {
        const presetWithInvalidVersion = {...validPresetV2, version: 999 as any};
        await expect(
            aegixPassGenerator('password', 'example.com', presetWithInvalidVersion)
        ).rejects.toThrow('Unsupported preset version');
    });
});
