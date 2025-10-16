/**
 * 定义密码生成所使用的哈希算法。
 */
export enum HashAlgorithm {
  Sha256 = 'sha256',
  Blake3 = 'blake3',
  Sha3_256 = 'sha3_256',
  Argon2id = 'argon2id',
  Scrypt = 'scrypt',
}

/**
 * 定义密码生成所使用的确定性随机数生成器 (RNG) 算法。
 */
export enum RngAlgorithm {
  ChaCha20 = 'chaCha20',
}

/**
 * 定义密码洗牌所使用的算法。
 */
export enum ShuffleAlgorithm {
  FisherYates = 'fisherYates',
}

/**
 * 定义 AegixPass 密码生成预设的完整结构体。
 */
export interface Preset {
  name: string;
  version: number;
  hashAlgorithm: HashAlgorithm;
  rngAlgorithm: RngAlgorithm;
  shuffleAlgorithm: ShuffleAlgorithm;
  length: number;
  platformId: string;
  charsets: string[];
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
