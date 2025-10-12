// 定义存储在 localStorage 中的键
import type {Preset} from "$lib/aegixpass";

export const CUSTOM_PRESET_STORAGE_KEY = 'aegixpass-custom-preset';

// 编辑器的默认预设，仅在用户从未保存过自定义预设时使用
export const DEFAULT_CUSTOM_PRESET: Preset = {
    name: 'Custom - Default',
    version: 1,
    hashAlgorithm: 'sha256',
    rngAlgorithm: 'chaCha20',
    shuffleAlgorithm: 'fisherYates',
    length: 16,
    platformId: 'aegixpass.takuron.com',
    charsets: [
        '0123456789',
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '!@#$%^&*_+-='
    ]
};