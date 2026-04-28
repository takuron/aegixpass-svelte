// --- Dependencies ---
// --- 导入依赖 ---
// Serde library for serializing and deserializing Rust data structures to and from JSON.
// Serde 库，用于在 Rust 数据结构和 JSON 格式之间进行序列化和反序列化。
use serde::Deserialize;
// SHA-2 hashing library, a widely used standard hash function.
// SHA-2 哈希算法库，一个广泛使用的标准哈希函数。
use sha2::{Digest, Sha256};
// Random number generation libraries. The prelude imports the most common traits like Rng and SeedableRng.
// 随机数生成相关库。prelude 导入了最常用的 traits，如 Rng 和 SeedableRng。
use rand::prelude::*;
// ChaCha20 is a high-performance, deterministic random number generator (RNG) that can be created from a seed.
// ChaCha20 是一个高性能的、可从种子（seed）创建的确定性随机数生成器 (RNG)。
use rand_chacha::ChaCha20Rng;
use rand_hc::Hc128Rng;
use sha3::Sha3_256;
// thiserror library to easily derive the standard Error trait for custom error types.
// thiserror 库，可以方便地为自定义错误类型派生标准的 Error trait。
use thiserror::Error;
use argon2::{Algorithm as Argon2Algorithm , Argon2, Params, Version as Argon2Version};
use scrypt::{scrypt, Params as ScryptParams};

// --- 1. Define aegixPass JSON data structures and related enums ---
// --- 1. 定义 aegixPass 的 JSON 数据结构和相关枚举 ---

/// Defines the fast hash algorithm used for quick password generation.
// 定义用于快速密码生成的快哈希算法。
#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FastHashAlgorithm {
    Sha256,
    Blake3,
    Sha3_256,
}

/// Defines the slow (memory-hard) hash algorithm used for enhanced security.
// 定义用于增强安全性的慢（内存困难型）哈希算法。
#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SlowHashAlgorithm {
    Argon2id,
    Scrypt,
}

/// Defines the deterministic random number generator (RNG) algorithm used for password generation.
// 定义密码生成所使用的确定性随机数生成器 (RNG) 算法。
#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum RngAlgorithm {
    ChaCha20,
    Hc128
}

/// Defines all possible errors that can occur, using thiserror for more user-friendly error messages.
// 定义所有可能发生的错误，利用 thiserror 使错误信息更友好。
#[derive(Error, Debug, PartialEq)]
pub enum AegixPassError {
    #[error("Master password (passwordSource) and distinguish key (distinguishKey) cannot be empty.")]
    InputEmpty,
    #[error("Password length ({0}) is too short to guarantee inclusion of characters from all {1} charset groups.")]
    LengthTooShort(usize, usize),
    #[error("All charset groups must contain at least one character.")]
    EmptyCharset,
    #[error("Unsupported preset version: {0}. AegixPass only supports version 2.")]
    UnsupportedVersion(u32),
    #[error("Failed to parse the preset JSON: {0}")]
    PresetParseError(String),
    #[error("Argon2 hashing failed: {0}")]
    Argon2Error(String),
    #[error("Scrypt hashing failed: {0}")]
    ScryptError(String),
}

/// Defines the complete structure for an AegixPass password generation preset.
// 定义 AegixPass 密码生成预设的完整结构体。
#[derive(Debug, Deserialize, PartialEq)]
pub struct Preset {
    pub name: String,
    pub version: u32,
    #[serde(rename = "fastHashAlgorithm")]
    pub fast_hash_algorithm: FastHashAlgorithm,
    #[serde(rename = "slowHashAlgorithm")]
    pub slow_hash_algorithm: SlowHashAlgorithm,
    #[serde(rename = "rngAlgorithm")]
    pub rng_algorithm: RngAlgorithm,
    pub length: usize,
    #[serde(rename = "platformId")]
    pub platform_id: String,
    pub charsets: Vec<String>,
}

// --- 2. Core Password Generation Function ---
// --- 2. 核心密码生成函数 ---

/// The main function that generates the final password based on the given inputs and preset configuration.
// 主函数，根据给定的输入和预设配置，生成最终的密码。
pub fn aegixpass_generator(
    password_source: &str,
    distinguish_key: &str,
    preset: &Preset,
) -> Result<String, AegixPassError> {
    // --- (Stage A) Input Validation (Partial) ---
    // --- (阶段 A) 输入验证 (部分) ---
    if password_source.is_empty() || distinguish_key.is_empty() {
        return Err(AegixPassError::InputEmpty);
    }
    if preset.version != 2 {
        return Err(AegixPassError::UnsupportedVersion(preset.version));
    }
    if preset.length < preset.charsets.len() {
        return Err(AegixPassError::LengthTooShort(
            preset.length,
            preset.charsets.len(),
        ));
    }
    if preset.charsets.iter().any(|cs| cs.is_empty()) {
        return Err(AegixPassError::EmptyCharset);
    }

    // --- (Stage B) Generate the Master Seed ---
    // --- (阶段 B) 生成核心种子 ---
    let master_seed = generate_master_seed(password_source, distinguish_key, preset)?;

    // 从种子创建 RNG 实例
    let mut rng = create_rng_from_seed(master_seed, &preset.rng_algorithm);

    // --- (Stage C) Ensure at least one character from each charset is included (V2: Using RNG directly) ---
    // --- (阶段 C) 保证每个字符集至少出现一次 (V2: 直接使用 RNG) ---
    let mut final_password_chars: Vec<char> = Vec::with_capacity(preset.length);
    for charset_group in preset.charsets.iter() {
        let chars: Vec<char> = charset_group.chars().collect();
        let char_index = secure_random_range_u32(&mut *rng, chars.len() as u32) as usize;
        final_password_chars.push(chars[char_index]);
    }

    // --- (阶段 D) 填充密码剩余长度 ---
    let remaining_len = preset.length - final_password_chars.len();
    if remaining_len > 0 {
        let combined_charset_str: String = preset.charsets.join("");
        let combined_charset: Vec<char> = combined_charset_str.chars().collect();
        let combined_len = combined_charset.len() as u32;

        // --- 最终优化：不再洗牌，而是循环随机抽样 ---
        for _ in 0..remaining_len {
            let j = secure_random_range_u32(&mut *rng, combined_len) as usize;
            final_password_chars.push(combined_charset[j]);
        }
    }

    // --- (阶段 E) 最终整体洗牌 ---
    // --- 关键优化：同样使用 u32 版本的洗牌逻辑 ---
    for i in (1..final_password_chars.len()).rev() {
        let j = secure_random_range_u32(&mut *rng, (i + 1) as u32) as usize;
        final_password_chars.swap(i, j);
    }

    // --- (阶段 F) 组合并返回结果 ---
    Ok(final_password_chars.into_iter().collect())
}

/// Computes a fast hash of the input data using the specified algorithm.
// 使用指定的快哈希算法计算输入数据的哈希值。
fn compute_fast_hash(data: &str, algorithm: &FastHashAlgorithm) -> [u8; 32] {
    match algorithm {
        FastHashAlgorithm::Sha256 => {
            let mut hasher = Sha256::new();
            hasher.update(data.as_bytes());
            let result = hasher.finalize();
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&result);
            hash
        }
        FastHashAlgorithm::Blake3 => {
            let result = blake3::hash(data.as_bytes());
            *result.as_bytes()
        }
        FastHashAlgorithm::Sha3_256 => {
            let mut hasher = Sha3_256::new();
            hasher.update(data.as_bytes());
            let result = hasher.finalize();
            let mut hash = [0u8; 32];
            hash.copy_from_slice(&result);
            hash
        }
    }
}

/// Converts a 32-byte hash to a hexadecimal string.
// 将32字节的哈希值转换为十六进制字符串。
fn hash_to_hex(hash: &[u8; 32]) -> String {
    hash.iter()
        .map(|byte| format!("{:02x}", byte))
        .collect()
}

/// Generates a 32-byte deterministic master seed from all input information.
// 根据所有输入信息，生成一个32字节的确定性主种子（Master Seed）。
// 
// V2 算法流程：
// 1. 使用快哈希算法计算盐值（platform_id）的哈希
// 2. 使用快哈希算法计算原始密码的哈希
// 3. 按照v1的方法组合字符串（将原始密码替换为快哈希后的密码的十六进制表示）
// 4. 用这个组合字符串作为原文，快哈希处理后的盐值作为慢哈希的盐，
//    用慢哈希算法算出32位主种子
fn generate_master_seed(
    password_source: &str,
    distinguish_key: &str,
    preset: &Preset,
) -> Result<[u8; 32], AegixPassError> {
    // --- 步骤 1: 使用快哈希算法计算盐值（platform_id）的哈希 ---
    let fast_hashed_salt = compute_fast_hash(&preset.platform_id, &preset.fast_hash_algorithm);
    
    // --- 步骤 2: 使用快哈希算法计算原始密码的哈希 ---
    let fast_hashed_password = compute_fast_hash(password_source, &preset.fast_hash_algorithm);
    
    // --- 步骤 3: 按照v1的方法组合字符串（将原始密码替换为快哈希后的密码的十六进制表示） ---
    // 格式："AegixPass_V{version}:{platform_id}:{length}:{fast_hashed_password_hex}:{distinguish_key}:{charsets_json}"
    let charsets_json = serde_json::to_string(&preset.charsets)
        .map_err(|e| AegixPassError::PresetParseError(e.to_string()))?;
    
    let fast_hashed_password_hex = hash_to_hex(&fast_hashed_password);
    
    let input_data = format!(
        "AegixPass_V{}:{}:{}:{}:{}:{}",
        preset.version,
        preset.platform_id,
        preset.length,
        fast_hashed_password_hex,
        distinguish_key,
        charsets_json
    );
    
    // --- 步骤 4: 用慢哈希算法计算主种子 ---
    // 原文：input_data（组合字符串）
    // 盐值：fast_hashed_salt（快哈希处理后的盐值）
    match preset.slow_hash_algorithm {
        SlowHashAlgorithm::Argon2id => {
            // Argon2id 参数：
            // m_cost: 内存成本 (19456 KB = 19 MiB)
            // t_cost: 时间成本 (2 次迭代)
            // p_cost: 并行度 (1 个线程)
            let params = Params::new(19456, 2, 1, Some(32))
                .map_err(|e| AegixPassError::Argon2Error(e.to_string()))?;
            
            let argon2 = Argon2::new(Argon2Algorithm::Argon2id, Argon2Version::V0x13, params);
            
            let mut output = [0u8; 32];
            argon2
                .hash_password_into(input_data.as_bytes(), &fast_hashed_salt, &mut output)
                .map_err(|e| AegixPassError::Argon2Error(e.to_string()))?;
            
            Ok(output)
        }
        SlowHashAlgorithm::Scrypt => {
            // Scrypt 参数：
            // N: CPU/内存成本参数 (2^15 = 32768)
            // r: 块大小 (8)
            // p: 并行化参数 (1)
            let params = ScryptParams::new(15, 8, 1, 32)
                .map_err(|e| AegixPassError::ScryptError(e.to_string()))?;
            
            let mut output = [0u8; 32];
            scrypt(input_data.as_bytes(), &fast_hashed_salt, &params, &mut output)
                .map_err(|e| AegixPassError::ScryptError(e.to_string()))?;
            
            Ok(output)
        }
    }
}

/// Creates a usable deterministic random number generator (RNG) from the master seed and preset algorithm.
// 根据主种子和预设算法，创建一个可用的确定性随机数生成器 (RNG)。
fn create_rng_from_seed(seed: [u8; 32], rng_algorithm: &RngAlgorithm) -> Box<dyn RngCore> {
    match rng_algorithm {
        RngAlgorithm::ChaCha20 => Box::new(ChaCha20Rng::from_seed(seed)),
        RngAlgorithm::Hc128 => Box::new(Hc128Rng::from_seed(seed)),
    }
}

// --- 辅助函数：一个基于 u32 的、清晰、可移植的无偏范围生成器 ---
fn secure_random_range_u32(rng: &mut dyn RngCore, max: u32) -> u32 {
    let range = max;
    let zone = u32::MAX.wrapping_sub(u32::MAX.wrapping_rem(range));

    loop {
        let v = rng.next_u32();
        if v < zone {
            return v % range;
        }
    }
}

// --- Unit Test Module ---
// --- 单元测试模块 ---
#[cfg(test)]
mod tests {
    use super::*;

    fn load_default_preset() -> Preset {
        let json_preset = r#"
        {
          "name": "AegixPass - Sha256",
          "version": 2,
          "fastHashAlgorithm": "sha256",
          "slowHashAlgorithm": "argon2id",
          "rngAlgorithm": "chaCha20",
          "length": 16,
          "platformId": "aegixpass.takuron.com",
          "charsets": [
            "0123456789",
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "!@#$%^&*()_+-="
          ]
        }
        "#;
        serde_json::from_str(json_preset).expect("The preset JSON in the test is invalid")
    }

    fn load_sha3_preset() -> Preset {
        let json_preset = r#"
        {
          "name": "AegixPass - Sha3",
          "version": 2,
          "fastHashAlgorithm": "sha3_256",
          "slowHashAlgorithm": "argon2id",
          "rngAlgorithm": "hc128",
          "length": 16,
          "platformId": "aegixpass.takuron.com",
          "charsets": [
            "0123456789",
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "!@#$%^&*()_+-="
          ]
        }
        "#;
        serde_json::from_str(json_preset).expect("The preset JSON in the test is invalid")
    }

    fn load_argon2id_preset() -> Preset {
        let json_preset = r#"
        {
          "name": "AegixPass - Default",
          "version": 2,
          "fastHashAlgorithm": "sha256",
          "slowHashAlgorithm": "argon2id",
          "rngAlgorithm": "chaCha20",
          "length": 16,
          "platformId": "aegixpass.takuron.com",
          "charsets": [
            "0123456789",
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "!@#$%^&*()_+-="
          ]
        }
        "#;
        serde_json::from_str(json_preset).expect("The Argon2id preset JSON in the test is invalid")
    }

    fn load_scrypt_preset() -> Preset {
        let json_preset = r#"
        {
          "name": "AegixPass - Scrypt",
          "version": 2,
          "fastHashAlgorithm": "blake3",
          "slowHashAlgorithm": "scrypt",
          "rngAlgorithm": "chaCha20",
          "length": 20,
          "platformId": "aegixpass.takuron.com",
          "charsets": [
            "0123456789",
            "abcdefghijklmnopqrstuvwxyz",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            "!@#$%^&*()_+-="
          ]
        }
        "#;
        serde_json::from_str(json_preset).expect("The Scrypt preset JSON in the test is invalid")
    }

    #[test]
    fn test_preset_deserialization() {
        let preset = load_default_preset();
        assert_eq!(preset.name, "AegixPass - Sha256");
        assert_eq!(preset.version, 2);
        assert_eq!(preset.fast_hash_algorithm, FastHashAlgorithm::Sha256);
        assert_eq!(preset.slow_hash_algorithm, SlowHashAlgorithm::Argon2id);
        assert_eq!(preset.rng_algorithm, RngAlgorithm::ChaCha20);
        assert_eq!(preset.length, 16);
        assert_eq!(preset.platform_id, "aegixpass.takuron.com");
        assert_eq!(preset.charsets.len(), 4);
    }

    #[test]
    fn test_preset_deserialization_sha3() {
        let preset = load_sha3_preset();
        assert_eq!(preset.fast_hash_algorithm, FastHashAlgorithm::Sha3_256);
        assert_eq!(preset.slow_hash_algorithm, SlowHashAlgorithm::Argon2id);
        assert_eq!(preset.rng_algorithm, RngAlgorithm::Hc128);
    }

    #[test]
    fn test_preset_deserialization_scrypt() {
        let preset = load_scrypt_preset();
        assert_eq!(preset.fast_hash_algorithm, FastHashAlgorithm::Blake3);
        assert_eq!(preset.slow_hash_algorithm, SlowHashAlgorithm::Scrypt);
    }

    #[test]
    fn test_enum_deserialization() {
        // 测试 FastHashAlgorithm 枚举
        assert!(matches!(
            serde_json::from_str::<FastHashAlgorithm>(r#""sha256""#),
            Ok(FastHashAlgorithm::Sha256)
        ));
        assert!(matches!(
            serde_json::from_str::<FastHashAlgorithm>(r#""blake3""#),
            Ok(FastHashAlgorithm::Blake3)
        ));
        assert!(matches!(
            serde_json::from_str::<FastHashAlgorithm>(r#""sha3_256""#),
            Ok(FastHashAlgorithm::Sha3_256)
        ));

        // 测试 SlowHashAlgorithm 枚举
        assert!(matches!(
            serde_json::from_str::<SlowHashAlgorithm>(r#""argon2id""#),
            Ok(SlowHashAlgorithm::Argon2id)
        ));
        assert!(matches!(
            serde_json::from_str::<SlowHashAlgorithm>(r#""scrypt""#),
            Ok(SlowHashAlgorithm::Scrypt)
        ));
    }

    #[test]
    fn test_determinism() {
        let preset = load_default_preset();
        let pass1 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        let pass2 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        assert_eq!(pass1, pass2, "The same input should produce the same password");
    }

    #[test]
    fn test_uniqueness() {
        let preset = load_default_preset();
        let pass1 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        let pass2 = aegixpass_generator("MySecretPassword123!", "anothersite.org", &preset).unwrap();
        assert_ne!(pass1, pass2, "Different keys should produce different passwords");
    }

    #[test]
    fn test_all_charsets_are_used() {
        let preset = load_default_preset();
        let password = aegixpass_generator("a-very-long-and-random-password", "a-very-long-key", &preset).unwrap();
        for charset in &preset.charsets {
            assert!(charset.chars().any(|c| password.contains(c)), "Password '{}' must contain characters from charset '{}'", password, charset);
        }
    }

    #[test]
    fn test_error_on_length_too_short() {
        let mut preset = load_default_preset();
        preset.length = 3;
        let result = aegixpass_generator("password", "example.com", &preset);
        assert_eq!(result, Err(AegixPassError::LengthTooShort(3, 4)));
    }

    #[test]
    fn test_error_on_unsupported_version() {
        let mut preset = load_default_preset();
        preset.version = 1;
        let result = aegixpass_generator("password", "example.com", &preset);
        assert_eq!(result, Err(AegixPassError::UnsupportedVersion(1)));
    }



    #[test]
    fn test_determinism_sha3() {
        let preset = load_sha3_preset();
        let pass1 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        let pass2 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        assert_eq!(pass1, pass2, "The same input should produce the same password");
    }

    #[test]
    fn test_determinism_argon2id() {
        let preset = load_argon2id_preset();
        let pass1 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        let pass2 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        assert_eq!(pass1, pass2, "The same input should produce the same password with Argon2id");

        let pass3 = aegixpass_generator("AnotherPassword!", "example.com", &preset).unwrap();
        assert_ne!(pass1, pass3, "Different passwords should produce different results with Argon2id");
    }

    #[test]
    fn test_determinism_scrypt() {
        let preset = load_scrypt_preset();
        let pass1 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        let pass2 = aegixpass_generator("MySecretPassword123!", "example.com", &preset).unwrap();
        assert_eq!(pass1, pass2, "The same input should produce the same password with Scrypt");

        let pass3 = aegixpass_generator("AnotherPassword!", "example.com", &preset).unwrap();
        assert_ne!(pass1, pass3, "Different passwords should produce different results with Scrypt");
    }
}
