// src/lib/aegixpass/core.spec.ts

// 1. 从 vitest 导入测试所需的函数
import { describe, it, expect } from 'vitest';

// 2. 导入我们要测试的目标函数，以及新的预设加载函数
import { aegixPassGenerator, loadBuiltInPresets, type Preset} from '$lib/aegixpass'

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
      expectedPassword: 'tK2Vj^W&E-YVByG7',
    },
    {
      presetName: 'AegixPass - NoSymbol',
      expectedPassword: 'FRJuG7pq9LlidzZ9',
    },
    {
      presetName: 'AegixPass - Pin',
      expectedPassword: '693406',
    },
    {
      presetName: 'AegixPass - Short',
      expectedPassword: '+e%h_s5vC9',
    },
    {
      presetName: 'AegixPass - Sha3',
      expectedPassword: 'Md*FMyWCd!1KQG%H',
    },
  ];

  // --- 参数化测试 ---
  // it.each 会为 testCases 数组中的每一个对象都运行一次测试
  it.each(testCases)('should correctly generate password for preset: $presetName', async ({ presetName, expectedPassword }) => {
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
