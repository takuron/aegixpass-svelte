// 定义存储在 localStorage 中的键
import {HashAlgorithm, type Preset, RngAlgorithm, ShuffleAlgorithm} from "$lib/aegixpass";

export const CUSTOM_PRESET_STORAGE_KEY = 'aegixpass-custom-preset';

// 编辑器的默认预设，仅在用户从未保存过自定义预设时使用
export const DEFAULT_CUSTOM_PRESET: Preset = {
    name: 'Custom - Default',
    version: 1,
    hashAlgorithm: HashAlgorithm.Sha256,
    rngAlgorithm: RngAlgorithm.ChaCha20,
    shuffleAlgorithm: ShuffleAlgorithm.FisherYates,
    length: 16,
    platformId: 'aegixpass.takuron.com',
    charsets: [
        '0123456789',
        'abcdefghijklmnopqrstuvwxyz',
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '!@#$%^&*_+-='
    ]
};

export const SITE_URL = 'https://aegixpass.takuron.com';