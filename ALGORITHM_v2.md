# AegixPass V2 算法核心设计

AegixPass V2 是一种确定性派生密码生成算法，其输出只依赖于输入的主密码、区分密钥和预设配置。相同输入、相同预设和相同实现版本必须生成相同输出。所有文本输入与文件内容均按 UTF-8 处理。

其主要特点和设计原则如下：

- **确定性 (Deterministic)**：算法设计目的为可复现的密码派生过程，仅使用可固定复现的随机序列来完成密码生成操作，不依赖任何外部或硬件随机源。
- **不可逆性 (Irreversible)**：通过强大的单向加密哈希函数来处理输入，确保即使获取了生成的密码和预设，也无法反推出主密码。
- **复杂度保证 (Complexity Guarantee)**：算法确保最终生成的密码中，至少包含一个来自每个指定字符集（charsets）的字符。
- **抗碰撞性 (Collision Resistance)**：主密码、区分密钥或预设配置中任何微小的变化，都会通过哈希雪崩效应，导致最终密码发生巨大改变。

## 算法核心输入

算法的运作依赖于以下三个核心输入：

### 主密码 (`password_source`)
用户持有的核心秘密，程序永不存储。

### 区分密钥 (`distinguish_key`)
用于为不同服务（如网站域名或应用名称）生成不同密码的变量，作为区分生成结果的盐值。

### 预设 (`preset`)
一个 JSON 对象，定义了密码生成的所有参数。其结构如下：

```json
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
    "!@#$%^&*_+-="
  ]
}
```

- `name`: 预设名称，仅用于展示或识别。
- `version`: 算法的版本，V2 固定为 `2`。
- `fastHashAlgorithm`: 快哈希算法，用于预处理 `platformId` 和 `password_source`。
- `slowHashAlgorithm`: 慢哈希/密钥派生算法，用于生成 32 字节主种子。
- `rngAlgorithm`: 确定性随机序列算法，用于从主种子生成字符选择序列。
- `length`: 密码总长度，按 Unicode 标量值字符数计算。
- `platformId`: 平台 ID；参与慢哈希输入，同时经快哈希后作为慢哈希的盐值（即初始偏移量）。
- `charsets`: 字符集分组；最终密码保证每个分组至少出现 1 个字符。

## 详细算法流程

密码的生成过程严格遵循以下几个关键阶段：

### 阶段 A: 输入验证

在开始计算前，程序会进行严格的输入检查，以避免产生不安全或无效的结果。

- **非空验证**：确保主密码 (`password_source`) 和区分密钥 (`distinguish_key`) 均不为空。
- **版本验证**：确保 `version` 必须为 `2`。
- **长度验证**：确保请求的密码长度 (`length`) 必须大于或等于字符集分组的数量 (`charsets.length`)。
- **字符集验证**：确保 `charsets` 中每个字符串都至少包含一个字符（不能为空）。

### 阶段 B: 生成主种子 (Master Seed)

主种子生成是 V2 的核心：先用快哈希预处理关键输入，再用慢哈希生成固定长度种子。

1. **快哈希预处理**：对 platformId 和 password_source 分别执行 `fastHashAlgorithm`：
    - `fast_hashed_salt = FastHash(platformId)`：得到 32 字节二进制值，用作后续慢哈希的盐值（即初始偏移量）。
    - `fast_hashed_password = FastHash(password_source)`
    - `fast_hashed_password_hex = LowerHex(fast_hashed_password)`：转换为 64 个字符的小写十六进制字符串（格式必须使用小写字母，每个字节占两位，例如 `{:02x}`）。
2. **拼接输入数据**：将输入组合为固定格式字符串：
    - 格式: `"AegixPass_V{version}:{platformId}:{length}:{fast_hashed_password_hex}:{distinguish_key}:{charsets_json}"`
    - 注意：`charsets_json` 必须由标准 JSON 序列化得到（例如 `["0123456789","abcdefghijklmnopqrstuvwxyz"]`），不添加额外空格。这里的 `{platformId}` 是原始字符串。
3. **慢哈希派生**：使用 `slowHashAlgorithm` 生成 32 字节的 `master_seed`。
    - **确定性盐值（初始偏移量）**：为了保证确定性，将第 1 步生成的 `fast_hashed_salt`（即 `FastHash(platformId)`）直接作为慢哈希算法的盐值（salt/offset）。
    - **执行密钥派生**：
      - 对于 Argon2id（必选）：使用 Argon2id 模式，Argon2 v1.3，结合参数（内存成本: 19456 KiB 约 19 MiB，迭代次数: 2，并行度: 1），处理输入数据和确定的盐值/偏移量，输出 32 字节。
      - 对于 Scrypt（可选）：结合参数（N=32768, r=8, p=1），处理输入数据和确定的盐值/偏移量，输出 32 字节。

### 阶段 C: 保证每个字符集至少出现一次 (字符集保证)

使用 `master_seed` 创建预设指定的确定性 RNG（如 ChaCha20）。不引入额外的随机 nonce 或系统随机数。随后按 `charsets` 数组顺序遍历每个分组：

1. 将当前字符集字符串按 Unicode 标量值拆分为字符数组。
2. 使用 RNG 获取一个随机数。这里必须使用无偏的范围随机数生成逻辑（拒绝采样），生成 `[0, chars.len())` 范围内的索引。
3. 取对应索引的字符加入初始密码数组中。

### 阶段 D: 填充密码剩余长度

若此时密码数组的长度仍小于用户指定的 `length`：

1. **合并字符集**：按 `charsets` 原始顺序拼接所有字符集，形成合并字符池。池中的重复字符会提高该字符被抽中的权重，这属于预期的确定性行为，不能去重。
2. **填充字符**：循环抽取字符，直到长度达到 `length`。每次抽取都继续使用阶段 C 中同一个 RNG 实例和无偏范围随机数生成逻辑。

### 阶段 E: 最终整体洗牌

为了消除阶段 C 中引入的、保证性字符位置的任何可预测性，需要对整个密码数组进行最后一次确定性的 Fisher-Yates 洗牌。

1. **使用同一 RNG 流**：继续共享并使用前文的同一个 RNG 实例进行操作。
2. **Fisher-Yates 洗牌**：从后向前遍历密码数组，对于每个位置 `i`（从 `len - 1` 递减到 `1`），使用无偏范围随机数（拒绝采样）生成一个 `[0, i]` 范围内的随机索引 `j`，然后交换位置 `i` 和 `j` 的字符。

### 阶段 F: 组合并返回

将最终洗牌后的字符数组组合成一个字符串，并返回给用户。

## 跨平台实现注意事项

- **字符编码**：所有文件和字符串输入必须使用 UTF-8。字符索引基于 Unicode 标量值，而不是字节偏移。
- **快哈希十六进制**：快哈希结果转十六进制时必须使用小写字母。
- **RNG 生命周期**：RNG 仅从 32 字节的 `master_seed` 初始化。阶段 C、D、E 必须共享同一个 RNG 实例，绝对不能分别重新初始化。
- **无偏范围随机数**：生成范围随机数必须使用拒绝采样，避免简单大数取模导致的分布偏差。调用方需确保随机范围大于 0。

## 算法实现等级

为保证跨平台兼容性，V2 针对不同环境的密码学依赖能力，定义了“必选实现”和“可选实现”：

### 必选实现
所有兼容 V2 的实现都应支持：
- **快哈希**: `sha256`, `sha3_256`
- **慢哈希**: `argon2id`
- **随机序列**: `chaCha20`

### 可选实现
以下算法可以由实现方按需支持。若不支持，应在解析预设或执行算法前返回明确错误，**绝不能静默回退**：
- **快哈希**: `blake3`
- **慢哈希**: `scrypt`
- **随机序列**: `hc128`

---

通过以上步骤，AegixPass V2 算法确保了在任何兼容的实现上，只要输入完全一致，输出的密码也必然完全相同，同时提供高强度的安全保障。
