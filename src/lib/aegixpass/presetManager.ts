import { AegixPassError, HashAlgorithm, RngAlgorithm, ShuffleAlgorithm, type Preset } from './types';
// Vite/Vue 支持直接导入 JSON 文件，它会自动解析为 JavaScript 对象
import defaultPresetJson from './presets/default.preset.json';

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
// export function loadBuiltInPresets(): Preset[] {
//   // --- 修改部分：将所有导入的 JSON 对象都放入这个数组中 ---
//   const builtInJsons = [
//     defaultPresetJson,
//   ];
//
//   return builtInJsons.map(validateAndTransformObjectToPreset);
// }

export function loadBuiltInPresets(): Preset[] {
    // 1. 使用 import.meta.glob 静态导入所有位于 /static/preset/v1/ 目录下的 .json 文件
    // { eager: true } 确保这是同步导入，而不是返回一个 Promise
    // { as: 'raw' } 确保我们将文件内容作为原始字符串导入
    const presetModules = import.meta.glob('/static/preset/v1/*.json', {
        eager: true,
        query: '?raw',
        import: 'default'
    });

    const presets: Preset[] = [];
    for (const path in presetModules) {
        // 2. 忽略 index.json，我们只关心预设文件本身
        if (path.endsWith('index.json')) {
            continue;
        }

        try {
            const jsonContent = presetModules[path];
            const parsedJson = JSON.parse(jsonContent as string);
            presets.push(validateAndTransformObjectToPreset(parsedJson));
        } catch (error) {
            console.error(`Failed to parse or validate preset at ${path}:`, error);
        }
    }

    // 3. （可选）按名称排序，确保每次加载顺序一致
    presets.sort((a, b) => a.name.localeCompare(b.name));

    return presets;
}

/**
 * 解析并验证一个 JSON 字符串，优先检查版本号。
 * @param jsonContent - 包含预设配置的 JSON 格式字符串。
 * @returns {Preset} - 一个经过验证的 Preset 对象。
 * @throws {AegixPassError} - 如果 JSON 格式错误或验证失败。
 */
export function parseAndValidatePreset(jsonContent: string): Preset {
    let parsedJson: any;
    try {
        parsedJson = JSON.parse(jsonContent);
    } catch (error) {
        throw new AegixPassError('Failed to parse JSON string. Please check the file format.');
    }

    // 在结构化前，提前进行版本检查
    if (parsedJson.version === undefined) {
        throw new AegixPassError('Invalid preset: "version" field is missing.');
    }
    if (parsedJson.version !== 1) {
        throw new AegixPassError(`Unsupported preset version: "${parsedJson.version}". This app only supports version 1 presets.`);
    }

    // 版本正确，再进行完整的结构验证
    try {
        return validateAndTransformObjectToPreset(parsedJson);
    } catch (error) {
        if (error instanceof AegixPassError) {
            throw error; // 重新抛出我们的自定义验证错误
        }
        // 创建一个更通用的备用错误
        throw new AegixPassError('The JSON is valid, but the preset object structure is incorrect.');
    }
}
