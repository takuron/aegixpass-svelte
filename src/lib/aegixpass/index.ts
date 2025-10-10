// 导出所有类型和错误定义
export * from './types';

// 导出核心的生成器函数
export { aegixPassGenerator } from './core';

// --- 新增 ---
// 导出新的预设管理器函数
export { loadBuiltInPresets, parseAndValidatePreset } from './presetManager';
