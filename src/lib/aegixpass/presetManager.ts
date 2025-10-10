import { AegixPassError, HashAlgorithm, RngAlgorithm, ShuffleAlgorithm, type Preset } from './types';
// Vite/Vue 支持直接导入 JSON 文件，它会自动解析为 JavaScript 对象
import defaultPresetJson from './presets/default.preset.json';
import noSymbolPresetJson from './presets/no-symbol.preset.json';
import pinPresetJson from './presets/pin.preset.json';
import shortPresetJson from './presets/short.preset.json';
import sha3PresetJson from './presets/sha3.preset.json';

/**
 * 将一个普通的 JavaScript 对象（来自 JSON 解析）安全地转换为强类型的 Preset。
 * 这个函数会验证所有字段和枚举值。
 * @param obj - 从 JSON 解析出的未知对象
 * @returns {Preset} - 一个经过验证的 Preset 对象
 * @throws {AegixPassError} - 如果验证失败
 */
function validateAndTransformObjectToPreset(obj: any): Preset {
  // 检查基础字段是否存在
  const requiredKeys: (keyof Preset)[] = ['name', 'version', 'hashAlgorithm', 'rngAlgorithm', 'shuffleAlgorithm', 'length', 'platformId', 'charsets'];
  for (const key of requiredKeys) {
    if (obj[key] === undefined) {
      throw new AegixPassError(`Invalid preset object: missing key "${key}".`);
    }
  }

  // 验证并转换枚举值
  if (!Object.values(HashAlgorithm).includes(obj.hashAlgorithm)) {
    throw new AegixPassError(`Invalid hashAlgorithm: "${obj.hashAlgorithm}"`);
  }
  if (!Object.values(RngAlgorithm).includes(obj.rngAlgorithm)) {
    throw new AegixPassError(`Invalid rngAlgorithm: "${obj.rngAlgorithm}"`);
  }
  if (!Object.values(ShuffleAlgorithm).includes(obj.shuffleAlgorithm)) {
    throw new AegixPassError(`Invalid shuffleAlgorithm: "${obj.shuffleAlgorithm}"`);
  }

  // 验证数据类型
  if (typeof obj.name !== 'string' || typeof obj.length !== 'number' || !Array.isArray(obj.charsets)) {
    throw new AegixPassError('Invalid preset object: type mismatch for name, length, or charsets.');
  }

  // 所有检查通过后，将其视为一个合法的 Preset 对象返回
  return obj as Preset;
}

/**
 * 加载所有内置的预设文件。
 * @returns {Preset[]} 一个包含所有内置预设的数组。
 */
export function loadBuiltInPresets(): Preset[] {
  // --- 修改部分：将所有导入的 JSON 对象都放入这个数组中 ---
  const builtInJsons = [
    defaultPresetJson,
    noSymbolPresetJson,
    pinPresetJson,
    shortPresetJson,
    sha3PresetJson,
  ];

  return builtInJsons.map(validateAndTransformObjectToPreset);
}

/**
 * 解析并验证一个 JSON 字符串，通常来自用户上传的文件。
 * @param jsonContent - 包含预设配置的 JSON 格式字符串。
 * @returns {Preset} - 一个经过验证的 Preset 对象。
 * @throws {AegixPassError} - 如果 JSON 格式错误或验证失败。
 */
export function parseAndValidatePreset(jsonContent: string): Preset {
  try {
    const parsedJson = JSON.parse(jsonContent);
    return validateAndTransformObjectToPreset(parsedJson);
  } catch (error) {
    if (error instanceof AegixPassError) {
      throw error; // 重新抛出我们的自定义验证错误
    }
    throw new AegixPassError('Failed to parse JSON string. Please check the file format.');
  }
}
