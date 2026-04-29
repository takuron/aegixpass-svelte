import {
    FastHashAlgorithm,
    SlowHashAlgorithm,
    RngAlgorithm,
    type PresetV2
} from "$lib/aegixpass";

export const CUSTOM_PRESET_STORAGE_KEY = 'aegixpass-custom-preset';

export const DEFAULT_CUSTOM_PRESET: PresetV2 = {
    name: 'AegixPass - Custom',
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

export const SITE_URL = 'https://aegixpass.takuron.com';
