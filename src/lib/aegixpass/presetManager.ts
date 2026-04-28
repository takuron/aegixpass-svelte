import {
    AegixPassError,
    FastHashAlgorithm,
    SlowHashAlgorithm,
    HashAlgorithm,
    RngAlgorithm,
    ShuffleAlgorithm,
    type Preset,
    type PresetV1,
    type PresetV2
} from './types';

// --- 类型守卫函数 ---
function isPresetV2(obj: any): obj is PresetV2 {
    return obj.version === 2;
}

function isPresetV1(obj: any): obj is PresetV1 {
    return obj.version === 1;
}


// --- V1 预设验证 ---
/**
 * 验证 V1 预设对象。
 * @param obj 从 JSON 解析出的未知对象
 * @returns {PresetV1} 经过验证的 V1 Preset 对象
 * @throws {AegixPassError} 如果验证失败
 */
function validateAndTransformObjectToPresetV1(obj: any): PresetV1 {
    const requiredKeys: (keyof PresetV1)[] = [
        'name', 'version', 'hashAlgorithm', 'rngAlgorithm', 
        'shuffleAlgorithm', 'length', 'platformId', 'charsets'
    ];
    for (const key of requiredKeys) {
        if (obj[key] === undefined) {
            throw new AegixPassError(`Invalid preset object: missing key "${key}".`);
        }
    }

    if (!Object.values(HashAlgorithm).includes(obj.hashAlgorithm)) {
        throw new AegixPassError(`Invalid hashAlgorithm: "${obj.hashAlgorithm}"`);
    }
    if (!Object.values(RngAlgorithm).includes(obj.rngAlgorithm)) {
        throw new AegixPassError(`Invalid rngAlgorithm: "${obj.rngAlgorithm}"`);
    }
    if (!Object.values(ShuffleAlgorithm).includes(obj.shuffleAlgorithm)) {
        throw new AegixPassError(`Invalid shuffleAlgorithm: "${obj.shuffleAlgorithm}"`);
    }

    if (typeof obj.name !== 'string' || typeof obj.length !== 'number' || !Array.isArray(obj.charsets)) {
        throw new AegixPassError('Invalid preset object: type mismatch for name, length, or charsets.');
    }

    return obj as PresetV1;
}


// --- V2 预设验证 ---
/**
 * 验证 V2 预设对象。
 * @param obj 从 JSON 解析出的未知对象
 * @returns {PresetV2} 经过验证的 V2 Preset 对象
 * @throws {AegixPassError} 如果验证失败
 */
function validateAndTransformObjectToPresetV2(obj: any): PresetV2 {
    const requiredKeys: (keyof PresetV2)[] = [
        'name', 'version', 'fastHashAlgorithm', 'slowHashAlgorithm',
        'rngAlgorithm', 'length', 'platformId', 'charsets'
    ];
    for (const key of requiredKeys) {
        if (obj[key] === undefined) {
            throw new AegixPassError(`Invalid preset object: missing key "${key}".`);
        }
    }

    if (!Object.values(FastHashAlgorithm).includes(obj.fastHashAlgorithm)) {
        throw new AegixPassError(`Invalid fastHashAlgorithm: "${obj.fastHashAlgorithm}"`);
    }
    if (!Object.values(SlowHashAlgorithm).includes(obj.slowHashAlgorithm)) {
        throw new AegixPassError(`Invalid slowHashAlgorithm: "${obj.slowHashAlgorithm}"`);
    }
    if (!Object.values(RngAlgorithm).includes(obj.rngAlgorithm)) {
        throw new AegixPassError(`Invalid rngAlgorithm: "${obj.rngAlgorithm}"`);
    }

    if (typeof obj.name !== 'string' || typeof obj.length !== 'number' || !Array.isArray(obj.charsets)) {
        throw new AegixPassError('Invalid preset object: type mismatch for name, length, or charsets.');
    }

    return obj as PresetV2;
}


// --- 统一的预设验证 ---
/**
 * 将一个普通的 JavaScript 对象（来自 JSON 解析）安全地转换为强类型的 Preset。
 * 自动检测版本并应用相应的验证规则。
 * @param obj 从 JSON 解析出的未知对象
 * @returns {Preset} 经过验证的 Preset 对象
 * @throws {AegixPassError} 如果验证失败
 */
function validateAndTransformObjectToPreset(obj: any): Preset {
    if (obj.version === undefined) {
        throw new AegixPassError('Invalid preset: "version" field is missing.');
    }

    if (isPresetV2(obj)) {
        return validateAndTransformObjectToPresetV2(obj);
    } else if (isPresetV1(obj)) {
        return validateAndTransformObjectToPresetV1(obj);
    } else {
        throw new AegixPassError(`Unsupported preset version: "${obj.version}".`);
    }
}


/**
 * 加载 V1 版本的内置预设文件。
 * @returns {PresetV1[]} 一个包含所有 V1 内置预设的数组。
 */
export function loadBuiltInPresetsV1(): PresetV1[] {
    const presets: PresetV1[] = [];
    
    const presetModules = import.meta.glob('/static/preset/v1/*.json', {
        eager: true,
        query: '?raw',
        import: 'default'
    });

    for (const path in presetModules) {
        if (path.endsWith('index.json')) {
            continue;
        }

        try {
            const jsonContent = presetModules[path];
            const parsedJson = JSON.parse(jsonContent as string);
            const preset = validateAndTransformObjectToPreset(parsedJson);
            if (isPresetV1(preset)) {
                presets.push(preset);
            }
        } catch (error) {
            console.error(`Failed to parse or validate V1 preset at ${path}:`, error);
        }
    }

    presets.sort((a, b) => a.name.localeCompare(b.name));

    return presets;
}

/**
 * 加载 V2 版本的内置预设文件。
 * @returns {PresetV2[]} 一个包含所有 V2 内置预设的数组。
 */
export function loadBuiltInPresetsV2(): PresetV2[] {
    const presets: PresetV2[] = [];
    
    const presetModules = import.meta.glob('/static/preset/v2/*.json', {
        eager: true,
        query: '?raw',
        import: 'default'
    });

    for (const path in presetModules) {
        if (path.endsWith('index.json')) {
            continue;
        }

        try {
            const jsonContent = presetModules[path];
            const parsedJson = JSON.parse(jsonContent as string);
            const preset = validateAndTransformObjectToPreset(parsedJson);
            if (isPresetV2(preset)) {
                presets.push(preset);
            }
        } catch (error) {
            console.error(`Failed to parse or validate V2 preset at ${path}:`, error);
        }
    }

    presets.sort((a, b) => a.name.localeCompare(b.name));

    return presets;
}

/**
 * 加载所有内置的预设文件。
 * 优先加载 V2 预设，同时保留对 V1 预设的支持。
 * @returns {Preset[]} 一个包含所有内置预设的数组。
 */
export function loadBuiltInPresets(): Preset[] {
    const presetsV2 = loadBuiltInPresetsV2();
    if (presetsV2.length > 0) {
        return presetsV2;
    }
    return loadBuiltInPresetsV1();
}

/**
 * 解析并验证一个 JSON 字符串，优先检查版本号。
 * @param jsonContent 包含预设配置的 JSON 格式字符串。
 * @returns {Preset} 一个经过验证的 Preset 对象。
 * @throws {AegixPassError} 如果 JSON 格式错误或验证失败。
 */
export function parseAndValidatePreset(jsonContent: string): Preset {
    let parsedJson: any;
    try {
        parsedJson = JSON.parse(jsonContent);
    } catch (error) {
        throw new AegixPassError('Failed to parse JSON string. Please check the file format.');
    }

    if (parsedJson.version === undefined) {
        throw new AegixPassError('Invalid preset: "version" field is missing.');
    }

    try {
        return validateAndTransformObjectToPreset(parsedJson);
    } catch (error) {
        if (error instanceof AegixPassError) {
            throw error;
        }
        throw new AegixPassError('The JSON is valid, but the preset object structure is incorrect.');
    }
}
