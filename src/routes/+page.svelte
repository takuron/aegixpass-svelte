<script lang="ts">
    // --- 1. 导入依赖 ---
    import { onMount } from 'svelte';
    import { afterNavigate } from '$app/navigation';
    import {
        loadBuiltInPresets,
        AegixPassError,
        type Preset,
        parseAndValidatePreset, aegixPassGeneratorAsync
    } from '$lib/aegixpass';
    // 从共享的常量文件中导入 localStorage 键和默认的自定义预设对象
    import { CUSTOM_PRESET_STORAGE_KEY, DEFAULT_CUSTOM_PRESET } from '$lib/constants';

    // --- 2. 组件状态变量 (Component State) ---
    // 绑定主密码输入框的值
    let masterPassword = '';
    // 绑定区分密钥输入框的值
    let siteKey = '';
    // 存储所有可用的预设选项（内置 + 自定义）
    let availablePresets: Preset[] = [];
    // 绑定预设下拉选择框的当前选中值
    let selectedPreset: Preset;
    // 存储最终生成的密码
    let generatedPassword = '';
    // 控制生成按钮是否处于加载状态
    let isLoading = false;
    // 控制“已复制”提示的显示状态
    let copySuccess = false;

    // 用于错误提示模态框的状态变量
    let errorMsg = '';
    let errorModal: HTMLDialogElement; // 用于绑定 <dialog> DOM 元素

    // --- 3. 辅助函数 ---
    /**
     * 从 localStorage 加载自定义预设
     */
    function loadCustomPreset(): Preset {
        const savedPresetString = localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
        if (savedPresetString) {
            try {
                return parseAndValidatePreset(savedPresetString);
            } catch (e) {
                console.error('Failed to load custom preset from localStorage, using default.', e);
                return DEFAULT_CUSTOM_PRESET;
            }
        } else {
            return DEFAULT_CUSTOM_PRESET;
        }
    }

    /**
     * 重新加载所有预设（内置 + 自定义）
     */
    function reloadPresets() {
        // 步骤 1: 加载所有内置的 JSON 预设文件
        const builtInPresets = loadBuiltInPresets();

        // 步骤 2: 尝试从浏览器的 localStorage 中加载用户保存的自定义预设
        const customPreset = loadCustomPreset();

        // 步骤 3: 记住当前选中的预设名称（如果有）
        const previouslySelectedName = selectedPreset?.name;

        // 步骤 4: 将内置预设和自定义预设组合成一个完整的列表
        availablePresets = [...builtInPresets, customPreset];

        // 步骤 5: 恢复选中状态（优先选择之前选中的预设，如果不存在则选择第一个）
        if (availablePresets.length > 0) {
            if (previouslySelectedName) {
                const foundPreset = availablePresets.find(p => p.name === previouslySelectedName);
                if (foundPreset) {
                    selectedPreset = foundPreset;
                    return;
                }
            }
            // 如果没有找到之前选中的预设，选择第一个
            selectedPreset = availablePresets[0];
        }
    }

    // --- 4. 组件生命周期函数 (Lifecycle Function) ---
    // onMount 会在组件首次渲染到 DOM 后执行一次
    onMount(() => {
        reloadPresets();
    });

    // afterNavigate 会在每次导航到当前页面时执行
    // 这确保了用户从自定义预设页面返回主页时，预设列表会更新
    afterNavigate(() => {
        reloadPresets();
    });

    // --- 5. 事件处理函数 (Event Handlers) ---
    /**
     * 处理“生成密码”按钮的点击事件或表单提交事件。
     */
    async function handleGenerate() {
        // 基本验证：确保主密码和区分密钥不为空
        if (!masterPassword || !siteKey) {
            return;
        }

        isLoading = true;
        generatedPassword = '';

        try {
            // 像调用普通 async 函数一样调用我们的 Worker 封装！
            // 主线程在这里不会被阻塞，UI 会立刻更新。
            generatedPassword = await aegixPassGeneratorAsync(
                masterPassword,
                siteKey,
                selectedPreset
            );
        } catch (e) {
            console.error(e);
            if (e instanceof AegixPassError || e instanceof Error) {
                errorMsg = e.message;
                errorModal.showModal();
            }
        } finally {
            isLoading = false;
        }
    }

    /**
     * 处理“复制”按钮的点击事件。
     */
    function handleCopy() {
        if (!generatedPassword) return;

        // 使用浏览器的 Clipboard API 将密码复制到剪贴板
        navigator.clipboard.writeText(generatedPassword).then(() => {
            copySuccess = true; // 显示“已复制”提示
            // 2秒后自动隐藏提示
            setTimeout(() => (copySuccess = false), 2000);
        });
    }
</script>

<svelte:head>
    <title>AegixPass - 安全、免费、开源的确定性密码派生工具</title>
    <meta name="description" content="AegixPass 是一款零信任、纯客户端的确定性密码生成器。无需存储密码，只需一个主密码即可为所有网站生成安全、可复现的密码。" />
</svelte:head>

<div class="card w-full max-w-lg bg-base-100 shadow-xl transition-all">
    <form class="card-body" on:submit|preventDefault={handleGenerate}>
        <h1 class="card-title text-2xl font-bold">AegixPass</h1>
        <p class="text-base-content/70 mb-6">一个安全、免费、开源的确定性密码派生工具</p>

        <div class="form-control w-full floating-label">
            <span>主密码</span>
            <input
                    bind:value={masterPassword}
                    type="password"
                    placeholder="主密码"
                    class="input input-bordered w-full validator"
                    required
            />
            <div class="validator-hint">主密码是必填项</div>
        </div>

        <div class="form-control w-full floating-label">
            <span>区分密钥 (例如 a.com)</span>
            <input
                    bind:value={siteKey}
                    type="text"
                    placeholder="区分密钥 (例如 a.com)"
                    class="input input-bordered w-full validator"
                    required
            />
            <div class="validator-hint">区分密钥是必填项</div>
        </div>

        <div class="form-control w-full">
            <div class="label mb-1">
                <span class="label-text">选择预设配置</span>
            </div>
            <select bind:value={selectedPreset} class="select select-bordered w-full">
                {#each availablePresets as preset (preset.name)}
                    <option value={preset}>{preset.name}</option>
                {/each}
            </select>
        </div>

        <div class="card-actions justify-end mt-6">
            <button class="btn btn-primary w-full" type="submit" disabled={isLoading}>
                {#if isLoading}
                    正在生成
                {:else}
                    生成密码
                {/if}
            </button>
        </div>

        <div class="mt-6 space-y-2">
            {#if isLoading}
                <div class="flex justify-center items-center h-full my-10">
                    <span class="loading loading-dots loading-lg"></span>
                </div>
            {:else if generatedPassword}
                <div>
                    <div class="mockup-code relative">
                        <pre class="px-4 py-2 whitespace-pre-wrap break-all"><code>{generatedPassword}</code></pre>
                        <button
                                class="btn btn-ghost btn-sm absolute top-2 right-2"
                                on:click={handleCopy}
                                type="button"
                        >
                            {copySuccess ? '✅ 已复制' : '📋 复制'}
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </form>
</div>

<dialog id="error_modal" class="modal" bind:this={errorModal}>
    <div class="modal-box">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="font-bold text-lg text-error">生成失败!</h3>
        <p class="py-4">{errorMsg}</p>
    </div>
</dialog>
