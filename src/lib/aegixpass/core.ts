// --- 1. 导入依赖 ---
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { sha3_256 } from '@noble/hashes/sha3.js';
import { blake3 } from '@noble/hashes/blake3.js';
import { chacha20 } from '@noble/ciphers/chacha.js';
import { AegixPassError, HashAlgorithm, RngAlgorithm, type Preset } from './types';


// --- 3. 关键辅助函数：无偏的范围随机数生成器 ---
/**
 * 使用“拒绝采样”方法，从一个 u32 随机数生成器中，安全地生成一个在 [0, max) 范围内的无偏随机整数。
 * 这个函数的数学逻辑与我们最终在 Rust 版本中定义的 `secure_random_range_u32` 完全等价，是保证跨平台一致性的核心。
 * @param next_u32 一个返回 32 位无符号整数 (0 到 2^32 - 1) 的函数。
 * @param max 范围的上限（不包含）。
 * @returns 一个在 [0, max) 范围内的、无偏差的随机整数。
 */
function secureRandomRange_u32(next_u32: () => number, max: number): number {
  const range = max;
  // u32 的最大值 (2^32 - 1)
  const U32_MAX = 4294967295;
  // 计算“有效区域”的阈值。
  // 只有小于这个阈值的随机数才会被接受，以避免模运算带来的偏差。
  const zone = U32_MAX - (U32_MAX % range);

  let v;
  do {
    // 从我们的 chacha20 流中获取下一个 u32
    v = next_u32();
    // 如果 v 落在了“无效区域”，则丢弃它，重新取一个，直到它落在有效区域内为止。
  } while (v >= zone);

  // 因为 v 保证在有效区域内，所以这次取模是完全无偏的。
  return v % range;
}

// --- 5. 辅助函数：生成主种子 ---
/**
 * 根据所有输入信息，生成一个32字节的确定性主种子 (Master Seed)。
 * @returns 32字节的 Uint8Array
 */
async function generateMasterSeed(password_source: string, distinguish_key: string, preset: Preset): Promise<Uint8Array> {
  // 拼接输入字符串，确保任何输入的改变都会导致种子改变
  const charsetsJson = JSON.stringify(preset.charsets);
  const inputData = `AegixPass_V${preset.version}:${preset.platformId}:${preset.length}:${password_source}:${distinguish_key}:${charsetsJson}`;

  // 根据预设算法进行哈希计算
  switch (preset.hashAlgorithm) {
    case HashAlgorithm.Sha256: return nobleSha256(new TextEncoder().encode(inputData));
    case HashAlgorithm.Blake3: return blake3(new TextEncoder().encode(inputData));
    case HashAlgorithm.Sha3_256: return sha3_256(new TextEncoder().encode(inputData));
    default: throw new Error(`Unsupported hash algorithm: ${preset.hashAlgorithm}`);
  }
}

// --- 4. 核心密码生成函数 ---
/**
 * 主函数，根据给定的输入和预设配置，生成最终的密码。
 * 严格遵循 ALGORITHM.md 中定义的流程。
 * @param password_source 你的主密码
 * @param distinguish_key 用于区分不同密码的密钥
 * @param preset 密码生成配置
 * @returns 生成的密码字符串
 */
export async function aegixPassGenerator(
  password_source: string,
  distinguish_key: string,
  preset: Preset
): Promise<string> {
  // --- (阶段 A) 输入验证 ---
  if (!password_source || !distinguish_key) { throw new AegixPassError('Master password and distinguish key cannot be empty.'); }
  if (preset.length < preset.charsets.length) { throw new AegixPassError(`Password length (${preset.length}) is too short for ${preset.charsets.length} charset groups.`); }
  if (preset.charsets.some(cs => cs.length === 0)) { throw new AegixPassError('All charset groups must contain at least one character.'); }
  if (preset.rngAlgorithm !== RngAlgorithm.ChaCha20) { throw new AegixPassError(`This implementation only supports the 'chaCha20' RNG algorithm.`); }

  // --- (阶段 B) 生成主种子 ---
  const masterSeed = await generateMasterSeed(password_source, distinguish_key, preset);
  let finalPasswordChars: string[] = [];

  // --- (阶段 C) 保证每个字符集至少出现一次 ---
  // 这个阶段的操作是确定性的，不涉及洗牌。
  for (const [i, charsetGroup] of preset.charsets.entries()) {
    const startIndex = i * 4; // 索引 i 依然可用
    const chunk = masterSeed.slice(startIndex, startIndex + 4);
    const dataView = new DataView(chunk.buffer);
    const index_seed = dataView.getUint32(0, true);
    // 现在 TypeScript 100% 确定 charsetGroup 是一个字符串，错误消失
    const char_index = index_seed % charsetGroup.length;
    finalPasswordChars.push(charsetGroup[char_index]!);
  }

  // --- 准备确定性随机数生成器 ---
  const key = masterSeed;
  const nonce = new Uint8Array(12).fill(0); // 使用全零的 nonce，与 Rust rand_chacha 默认行为一致
  // 生成一个足够长的随机字节流，供后续所有随机操作使用
  const randomByteStream = chacha20(key, nonce, new Uint8Array(4096));

  // 定义一个从字节流中持续提取 u32 数字的辅助函数
  let byteIndex = 0;
  const next_u32 = (): number => {
    const view = new DataView(randomByteStream.buffer, byteIndex, 4);
    byteIndex += 4;
    return view.getUint32(0, true); // 按小端序读取
  };

  // --- (阶段 D) 填充密码剩余长度 ---
  const remainingLen = preset.length - finalPasswordChars.length;
  if (remainingLen > 0) {
    const combinedCharsetStr = preset.charsets.join('');
    const combinedCharset = combinedCharsetStr.split('');
    const combinedLen = combinedCharset.length;

    // --- 最终优化：不再洗牌，而是循环随机抽样 ---
    for (let i = 0; i < remainingLen; i++) {
      const j = secureRandomRange_u32(next_u32, combinedLen);
      finalPasswordChars.push(combinedCharset[j]!);
    }
  }

  // --- (阶段 E) 最终整体洗牌 ---
  // 同样使用我们与 Rust 完全等价的洗牌逻辑
  for (let i = finalPasswordChars.length - 1; i > 0; i--) {
    const j = secureRandomRange_u32(next_u32, i + 1);
    [finalPasswordChars[i], finalPasswordChars[j]] = [finalPasswordChars[j]!, finalPasswordChars[i]!];
  }

  // --- (阶段 F) 组合并返回结果 ---
  return finalPasswordChars.join('');
}
