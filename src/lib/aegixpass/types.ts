/**
 * 定义用于快速密码生成的快哈希算法。
 */
export enum FastHashAlgorithm {
  Sha256 = 'sha256',
  Blake3 = 'blake3',
  Sha3_256 = 'sha3_256',
}

/**
 * 定义用于增强安全性的慢（内存困难型）哈希算法。
 */
export enum SlowHashAlgorithm {
  Argon2id = 'argon2id',
  Scrypt = 'scrypt',
}

/**
 * 定义密码生成所使用的确定性随机数生成器 (RNG) 算法。
 */
export enum RngAlgorithm {
  ChaCha20 = 'chaCha20',
  Hc128 = 'hc128',
}

/**
 * 定义密码洗牌所使用的算法 (V1 遗留)。
 */
export enum ShuffleAlgorithm {
  FisherYates = 'fisherYates',
}

/**
 * 定义所有可能发生的错误，便于进行统一的错误处理。
 */
export class AegixPassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AegixPassError';
  }
}

/**
 * V1 预设结构 (遗留)。
 */
export interface PresetV1 {
  name: string;
  version: 1;
  hashAlgorithm: HashAlgorithm;
  rngAlgorithm: RngAlgorithm;
  shuffleAlgorithm: ShuffleAlgorithm;
  length: number;
  platformId: string;
  charsets: string[];
}

/**
 * V2 预设结构。
 */
export interface PresetV2 {
  name: string;
  version: 2;
  fastHashAlgorithm: FastHashAlgorithm;
  slowHashAlgorithm: SlowHashAlgorithm;
  rngAlgorithm: RngAlgorithm;
  length: number;
  platformId: string;
  charsets: string[];
}

/**
 * 统一的预设类型，可以是 V1 或 V2。
 */
export type Preset = PresetV1 | PresetV2;

/**
 * 预设索引项，用于 index.json 文件中定义预设列表。
 */
export interface PresetIndexItem {
  name: string;
  file: string;
  hide?: boolean;
}

/**
 * V1 哈希算法枚举 (遗留)。
 */
export enum HashAlgorithm {
  Sha256 = 'sha256',
  Blake3 = 'blake3',
  Sha3_256 = 'sha3_256',
  Argon2id = 'argon2id',
  Scrypt = 'scrypt',
}
