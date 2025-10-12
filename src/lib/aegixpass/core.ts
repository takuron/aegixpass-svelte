// src/lib/aegixpass/core.ts

// --- 1. 导入依赖 ---
// 从 @noble/hashes 库导入各种哈希算法的实现。
// 这些库是经过审计的、高性能的加密原语，适合在客户端环境中使用。
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { sha3_256 } from '@noble/hashes/sha3.js';
import { blake3 } from '@noble/hashes/blake3.js';
// 从 @noble/ciphers 库导入 ChaCha20 流密码的实现。
// ChaCha20 在这里被用作一个确定性的随机数生成器 (PRNG)。
import { chacha20 } from '@noble/ciphers/chacha.js';
// 从项目的类型定义文件中导入错误类和枚举类型。
// 这有助于保持代码的类型安全和一致性。
import { AegixPassError, HashAlgorithm, RngAlgorithm, type Preset } from './types';


// --- 3. 关键辅助函数：无偏的范围随机数生成器 ---
/**
 * 使用“拒绝采样”方法，从一个 u32 随机数生成器中，安全地生成一个在 [0, max) 范围内的无偏随机整数。
 * 这个函数的数学逻辑与 AegixPass Rust 实现中的 `secure_random_range_u32` 完全等价，是保证跨平台一致性的核心。
 * @param next_u32 一个返回 32 位无符号整数 (0 到 2^32 - 1) 的函数。
 * @param max 范围的上限（不包含）。
 * @returns 一个在 [0, max) 范围内的、无偏差的随机整数。
 */
function secureRandomRange_u32(next_u32: () => number, max: number): number {
    // 别名，使代码更易读
    const range = max;
    // u32 的最大值 (2^32 - 1)，用于计算拒绝采样的阈值
    const U32_MAX = 4294967295;
    // 计算“有效区域”的阈值。
    // 这是 `range` 的最大倍数，且小于等于 U32_MAX。
    // 只有当随机数小于这个阈值时才会被接受，这样可以完美避免简单取模运算带来的偏差。
    // 例如，如果 max=3, U32_MAX=10，那么 zone = 10 - (10 % 3) = 9。
    // 只有当随机数 v 在 [0, 8] 范围内时才接受，这样 0,1,2 被选中的概率才是完全均等的。
    const zone = U32_MAX - (U32_MAX % range);

    let v;
    do {
        // 从我们的 chacha20 流中获取下一个 u32 随机数
        v = next_u32();
        // 如果 v 落在了“无效区域”（即 v >= zone），则丢弃它，重新取一个，直到它落在有效区域内为止。
    } while (v >= zone);

    // 因为 v 保证在有效区域内，所以这次取模是完全无偏的，每个结果的概率都相等。
    return v % range;
}

// --- 5. 辅助函数：生成主种子 ---
/**
 * 根据所有影响密码生成的参数和用户输入，通过哈希运算生成一个 32 字节的确定性主种子 (Master Seed)。
 * 这个种子是后续所有伪随机操作的唯一来源。
 * @returns {Promise<Uint8Array>} 返回一个 Promise，解析为一个 32 字节的 Uint8Array 格式的种子。
 */
async function generateMasterSeed(password_source: string, distinguish_key: string, preset: Preset): Promise<Uint8Array> {
    // 严格按照算法文档定义的格式，将所有输入拼接成一个唯一的长字符串。
    // 这种设计确保了预设中的任何一个参数（甚至是 `charsets` 的顺序）发生变化，都会生成一个完全不同的种子。
    const charsetsJson = JSON.stringify(preset.charsets);
    const inputData = `AegixPass_V${preset.version}:${preset.platformId}:${preset.length}:${password_source}:${distinguish_key}:${charsetsJson}`;

    // 将拼接好的字符串编码为 UTF-8 格式的字节数组
    const encodedInput = new TextEncoder().encode(inputData);

    // 根据预设中指定的哈希算法，对编码后的输入进行哈希计算，并返回结果。
    switch (preset.hashAlgorithm) {
        case HashAlgorithm.Sha256: return nobleSha256(encodedInput);
        case HashAlgorithm.Blake3: return blake3(encodedInput);
        case HashAlgorithm.Sha3_256: return sha3_256(encodedInput);
        // 如果预设中的算法不被支持，则抛出错误。
        default: throw new Error(`Unsupported hash algorithm: ${preset.hashAlgorithm}`);
    }
}

// --- 4. 核心密码生成函数 ---
/**
 * 主函数，根据给定的主密码、区分密钥和预设配置，确定性地生成最终的密码。
 * 严格遵循 ALGORITHM.md 中定义的流程。
 * @param password_source 你的主密码，核心机密。
 * @param distinguish_key 用于为不同服务（如网站域名）生成不同密码的变量。
 * @param preset 密码生成的所有参数配置。
 * @returns {Promise<string>} 返回一个 Promise，解析为最终生成的密码字符串。
 */
export async function aegixPassGenerator(
    password_source: string,
    distinguish_key: string,
    preset: Preset
): Promise<string> {
    // --- (阶段 A) 输入验证 ---
    // 在开始计算前，进行严格的输入检查，以避免产生不安全或无效的结果。
    if (!password_source || !distinguish_key) { throw new AegixPassError('Master password and distinguish key cannot be empty.'); }
    if (preset.length < preset.charsets.length) { throw new AegixPassError(`Password length (${preset.length}) is too short for ${preset.charsets.length} charset groups.`); }
    if (preset.charsets.some(cs => cs.length === 0)) { throw new AegixPassError('All charset groups must contain at least one character.'); }
    if (preset.rngAlgorithm !== RngAlgorithm.ChaCha20) { throw new AegixPassError(`This implementation only supports the 'chaCha20' RNG algorithm.`); }

    // --- (阶段 B) 生成主种子 ---
    // 这是整个确定性算法的基石。
    const masterSeed = await generateMasterSeed(password_source, distinguish_key, preset);
    // 初始化一个数组，用于存放最终密码的字符。
    let finalPasswordChars: string[] = [];

    // --- (阶段 C) 保证每个字符集至少出现一次 (字符集保证) ---
    // 为了满足现代密码的复杂度要求，算法会确定性地从每个 `charsets` 分组中挑选一个字符。
    for (const [i, charsetGroup] of preset.charsets.entries()) {
        // 将 32 字节的主种子按顺序分割成多个 4 字节的块。
        const startIndex = i * 4;
        // 取出第 i 个 4 字节块。
        const chunk = masterSeed.slice(startIndex, startIndex + 4);
        const dataView = new DataView(chunk.buffer);
        // 将这个块解释为一个无符号 32 位整数（小端序）。
        const index_seed = dataView.getUint32(0, true); // `true` 表示 little-endian
        // 使用这个整数对当前字符集的长度进行取模运算，得到一个索引。
        const char_index = index_seed % charsetGroup.length;
        // 将该索引对应的字符添加到初始密码数组中。
        finalPasswordChars.push(charsetGroup[char_index]!); // `!` 是非空断言，因为我们已在阶段 A 验证过 charsetGroup 不为空
    }

    // --- 准备确定性随机数生成器 (RNG) ---
    // 使用整个 32 字节主种子来初始化 ChaCha20。
    const key = masterSeed;
    // 使用一个 12 字节的全零数组作为 nonce。
    // 这是为了与 Rust `rand_chacha` 库的默认行为完全一致，是跨平台兼容的关键。
    const nonce = new Uint8Array(12).fill(0);
    // 生成一个足够长的随机字节流 (4KB)，供后续所有随机操作使用。
    // ChaCha20 是流密码，可以生成任意长度的伪随机字节。
    const randomByteStream = chacha20(key, nonce, new Uint8Array(4096));

    // 定义一个从字节流中持续提取 u32 数字的辅助函数。
    let byteIndex = 0;
    const next_u32 = (): number => {
        // 从字节流的当前位置创建一个 4 字节的视图
        const view = new DataView(randomByteStream.buffer, byteIndex, 4);
        // 移动索引，为下一次读取做准备
        byteIndex += 4;
        // 按小端序读取一个 32 位无符号整数并返回
        return view.getUint32(0, true);
    };

    // --- (阶段 D) 填充密码剩余长度 ---
    // 计算还需要填充多少个字符
    const remainingLen = preset.length - finalPasswordChars.length;
    if (remainingLen > 0) {
        // 将所有字符集中的字符合并成一个大的字符池
        const combinedCharsetStr = preset.charsets.join('');
        const combinedCharset = combinedCharsetStr.split('');
        const combinedLen = combinedCharset.length;

        // 循环填充剩余长度的每一个位置
        for (let i = 0; i < remainingLen; i++) {
            // 使用无偏的范围随机数生成器，从字符池中公平地选择一个字符的索引
            const j = secureRandomRange_u32(next_u32, combinedLen);
            // 将选出的字符添加到密码数组中
            finalPasswordChars.push(combinedCharset[j]!);
        }
    }

    // --- (阶段 E) 最终整体洗牌 (Fisher-Yates Shuffle) ---
    // 为了消除阶段 C 中引入的、保证性字符位置的任何可预测性，
    // 需要对整个密码数组进行最后一次确定性的洗牌。
    // 从后向前遍历密码数组
    for (let i = finalPasswordChars.length - 1; i > 0; i--) {
        // 使用 RNG 生成一个 `[0, i]` 范围内的随机索引 `j`
        const j = secureRandomRange_u32(next_u32, i + 1);
        // 交换位置 `i` 和 `j` 的字符
        [finalPasswordChars[i], finalPasswordChars[j]] = [finalPasswordChars[j]!, finalPasswordChars[i]!];
    }

    // --- (阶段 F) 组合并返回结果 ---
    // 将最终洗牌后的字符数组组合成一个字符串。
    return finalPasswordChars.join('');
}
