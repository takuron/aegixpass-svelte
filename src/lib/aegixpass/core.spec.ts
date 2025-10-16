// src/lib/aegixpass/core.spec.ts

// 1. 从 vitest 导入测试所需的函数
import {describe, expect, it} from 'vitest';

// 2. 导入我们要测试的目标函数，以及新的预设加载函数
import {
    AegixPassError,
    aegixPassGenerator,
    HashAlgorithm,
    loadBuiltInPresets,
    type Preset,
    RngAlgorithm,
    ShuffleAlgorithm
} from '$lib/aegixpass'

// 3. 使用 'describe' 来创建一个测试套件
describe('aegixPassGenerator with built-in presets', () => {
    // --- 准备工作 ---
    // 1. 定义一组所有测试用例都将使用的通用输入
    const masterPassword = 'MySecretPassword123!';
    const distinguishKey = 'example.com';

    // 2. 加载所有内置的预设，我们将在测试中查找并使用它们
    const allPresets = loadBuiltInPresets();

    // 3. 定义我们的“对照表”。每一行代表一个测试用例。
    //    你需要将 placeholder 替换为从你的 Rust/Java 实现中得到的真实密码。
    const testCases = [
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
            expectedPassword: 'ab8H8INYohXlKvnfwv4jn4WmRYu8MNa',
        },
    ];

    // --- 参数化测试 ---
    // it.each 会为 testCases 数组中的每一个对象都运行一次测试
    it.each(testCases)('should correctly generate password for preset: $presetName', async ({
                                                                                                presetName,
                                                                                                expectedPassword
                                                                                            }) => {
        // --- Arrange ---
        // 从已加载的预设中，根据名称找到当前测试用例所需的预设
        const preset = allPresets.find(p => p.name === presetName);

        // 确保预设被找到了，这是一个很好的健壮性检查
        expect(preset, `Preset named "${presetName}" should exist.`).toBeDefined();

        // --- Act ---
        const generatedPassword = await aegixPassGenerator(
            masterPassword,
            distinguishKey,
            preset as Preset // 我们已经用 toBeDefined 检查过，所以这里可以安全地断言
        );

        // --- Assert ---
        expect(generatedPassword).toBe(expectedPassword);
    });
});

describe('aegixPassGenerator with edge case inputs', () => {
    // 使用一个基础的、行为可预测的预设
    const basicPreset: Preset = {
        name: 'Test-Basic',
        version: 1,
        hashAlgorithm: HashAlgorithm.Sha256,
        rngAlgorithm: RngAlgorithm.ChaCha20,
        shuffleAlgorithm: ShuffleAlgorithm.FisherYates,
        length: 4,
        platformId: 'aegixpass.takuron.com',
        charsets: ['a', 'b', 'c', 'd']
    };

    // --- 测试用例定义 ---
    const edgeCaseInputs = [
        // Case 1: 输入仅包含空格
        {
            caseName: 'should handle inputs with only whitespace',
            masterPassword: '   ',
            distinguishKey: ' ',
            expectedToThrow: false // 算法应该能正常处理，因为空格也是字符
        },
        // Case 2: 输入包含各种 Unicode 字符和 Emoji
        {
            caseName: 'should handle inputs with Unicode and Emojis',
            masterPassword: '密码🔑123',
            distinguishKey: '测试网站.com 😊',
            expectedToThrow: false // 算法的核心是处理字节，所以应该能兼容任何 UTF-8 字符
        },
        // Case 3: 输入非常长
        {
            caseName: 'should handle very long inputs',
            masterPassword: 'a'.repeat(1000),
            distinguishKey: 'b'.repeat(1000),
            expectedToThrow: false
        },
        // Case 4: 密码长度刚好等于字符集数量
        {
            caseName: 'should work when password length equals the number of charsets',
            preset: {...basicPreset, length: 4}, // length (4) === charsets.length (4)
            expectedToThrow: false
        },
        // Case 5: 字符集中包含重复字符 (算法应该能正常处理)
        {
            caseName: 'should handle duplicate characters within charsets',
            preset: {...basicPreset, length: 10, charsets: ['aabc', 'ddee', 'ffgg']},
            expectedToThrow: false
        },
        // Case 6: 字符集中包含 Unicode 字符
        {
            caseName: 'should handle Unicode characters in charsets',
            preset: {...basicPreset, length: 10, charsets: ['你好', '🚀', 'AB']},
            expectedToThrow: false
        }
    ];

    // --- 运行测试 ---
    edgeCaseInputs.forEach(({
                                caseName,
                                masterPassword = 'default',
                                distinguishKey = 'default',
                                preset = basicPreset,
                                expectedToThrow
                            }) => {
        it(caseName, async () => {
            if (expectedToThrow) {
                // 对于预期会抛出错误的用例
                await expect(
                    aegixPassGenerator(masterPassword, distinguishKey, preset)
                ).rejects.toThrow(AegixPassError);
            } else {
                // 对于预期会成功的用例
                const password = await aegixPassGenerator(masterPassword, distinguishKey, preset);
                expect(password).toBeDefined();
                expect(typeof password).toBe('string');
                if (preset.length) {
                    expect(password.length).toBe(preset.length);
                }
            }
        });
    });
});

describe('aegixPassGenerator input validation', () => {

    const validPreset: Preset = {
        name: 'Test-Basic',
        version: 1,
        hashAlgorithm: HashAlgorithm.Sha256,
        rngAlgorithm: RngAlgorithm.ChaCha20,
        shuffleAlgorithm: ShuffleAlgorithm.FisherYates,
        length: 4,
        platformId: 'aegixpass.takuron.com',
        charsets: ['a', 'b', 'c', 'd']
    };


    it('should throw if master password is empty', async () => {
        await expect(
            aegixPassGenerator('', 'example.com', validPreset)
        ).rejects.toThrow('Master password and distinguish key cannot be empty.');
    });

    it('should throw if distinguish key is empty', async () => {
        await expect(
            aegixPassGenerator('password', '', validPreset)
        ).rejects.toThrow('Master password and distinguish key cannot be empty.');
    });

    it('should throw if password length is less than number of charsets', async () => {
        const presetWithShortLength = {...validPreset, length: 2, charsets: ['a', 'b', 'c']};
        await expect(
            aegixPassGenerator('password', 'example.com', presetWithShortLength)
        ).rejects.toThrow(/Password length \(2\) is too short for 3 charset groups/);
    });

    it('should throw if a charset group is empty', async () => {
        const presetWithEmptyCharset = {...validPreset, charsets: ['a', 'b', '']};
        await expect(
            aegixPassGenerator('password', 'example.com', presetWithEmptyCharset)
        ).rejects.toThrow('All charset groups must contain at least one character.');
    });
});