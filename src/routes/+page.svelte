<script lang="ts">
    // --- 1. 导入 Svelte 和我们的库 ---
    import { onMount } from 'svelte';
    import {
        aegixPassGenerator,
        loadBuiltInPresets,
        AegixPassError,
        type Preset,
    } from '$lib/aegixpass';

    // --- 2. 定义组件的响应式状态 ---
    // 在 Svelte 中，使用 `let` 声明的顶层变量默认就是响应式的。
    // 当这些变量的值发生变化时，UI 中使用到它们的地方会自动更新。
    let masterPassword = ''; // 绑定主密码输入框
    let siteKey = ''; // 绑定区分密钥输入框
    let availablePresets: Preset[] = []; // 存储所有可用的预设配置
    let selectedPreset: Preset | undefined; // 绑定预设下拉选择框

    let generatedPassword = ''; // 存储生成的密码
    let errorMsg = ''; // 存储错误信息
    let isLoading = false; // 控制“生成中”的加载状态
    let copySuccess = false; // 控制“复制成功”的提示状态

    // --- 3. 组件加载时执行的逻辑 ---
    // onMount 是 Svelte 的生命周期函数，它会在组件挂载到 DOM 后执行一次。
    // 非常适合用来获取初始数据。
    onMount(() => {
        availablePresets = loadBuiltInPresets();
        // 自动选择第一个预设作为默认值，提升用户体验。
        if (availablePresets.length > 0) {
            selectedPreset = availablePresets[0];
        }
    });

    // --- 4. “生成密码”按钮的点击事件处理函数 ---
    async function handleGenerate() {
        // 如果验证失败，则直接返回，不执行后续的密码生成逻辑。
        if (!masterPassword||!siteKey) {
            return;
        }

        // 如果验证通过，则清空旧密码并进入加载状态。
        generatedPassword = '';
        isLoading = true;

        try {
            generatedPassword = await aegixPassGenerator(
                masterPassword,
                siteKey,
                selectedPreset as Preset // 此时 preset 必然有值
            );
        } catch (e) {
            // 捕获算法本身的错误，并在控制台显示
            // 如果需要，也可以在这里设置一个通用的“算法错误”提示
            console.error(e);
            if (e instanceof AegixPassError) {
                // 你可以在这里添加一个全局的 alert-error 来显示算法错误
                // 例如： formErrors.general = `算法错误: ${e.message}`;
            }
        } finally {
            isLoading = false;
        }
    }

    // --- 5. “复制密码”按钮的点击事件处理函数 ---
    function handleCopy() {
        if (!generatedPassword) return; // 防御性编程，确保有密码可复制
        // 使用浏览器原生的 Clipboard API，安全可靠。
        navigator.clipboard.writeText(generatedPassword).then(() => {
            copySuccess = true; // 更新状态，UI 会自动显示“已复制”
            // 2秒后自动将提示消失，避免永久占据屏幕空间。
            setTimeout(() => (copySuccess = false), 2000);
        });
    }

    // --- 6. 主题切换功能 ---
    // 一个简单的函数，通过修改 <html> 元素的 `data-theme` 属性来切换 daisyUI 主题。
    function setTheme(theme: string) {
        document.documentElement.setAttribute('data-theme', theme);
    }
</script>

<div class="drawer lg:drawer-open bg-base-200 min-h-screen">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />

    <div class="drawer-content flex flex-col items-center justify-center p-4">
        <label for="my-drawer" class="btn btn-primary drawer-button lg:hidden absolute top-4 left-4 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </label>

        <div class="card w-full max-w-lg bg-base-100 shadow-xl transition-all">
            <form class="card-body">
                <h2 class="card-title text-2xl font-bold">AegixPass</h2>
                <p class="text-base-content/70 mb-6">一个安全、确定性的密码生成器</p>


                    <div class="form-control w-full floating-label">
                        <span>主密码</span>
                        <input
                                bind:value={masterPassword}
                                type='password'
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
                        <select bind:value={selectedPreset} class="select select-bordered w-full md:w-auto min-w-64">
                            {#each availablePresets as preset (preset.name)}
                                <option value={preset}>{preset.name}</option>
                            {/each}
                        </select>
                    </div>

                <div class="card-actions justify-end mt-6">
                    <button
                            on:click={handleGenerate}
                            class="btn btn-primary w-full"
                            type="submit"
                            disabled={isLoading}
                    >
                        {#if isLoading}
                            <span class="loading loading-spinner"></span>
                            正在生成...
                        {:else}
                            生成密码
                        {/if}
                    </button>
                </div>

                {#if generatedPassword}
                    <div class="mt-6 space-y-2">
                        <div class="label"><span class="label-text">生成的密码:</span></div>
                        <div class="mockup-code relative">
                            <pre class="px-4 py-2"><code>{generatedPassword}</code></pre>
                            <button
                                    class="btn btn-ghost btn-sm absolute top-2 right-2"
                                    on:click={handleCopy}
                            >
                                {copySuccess ? '✅ 已复制' : '📋 复制'}
                            </button>
                        </div>
                    </div>
                {/if}
            </form>
        </div>
    </div>

    <div class="drawer-side">
        <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content">
            <li class="menu-title"><span>AegixPass</span></li>
            <li><a>首页</a></li>
            <li><a>算法介绍</a></li>
            <li><a>自定义预设</a></li>
            <div class="divider"></div>
            <li class="menu-title"><span>主题切换</span></li>
            <li><a on:click={() => setTheme('light')}>☀️ Light</a></li>
            <li><a on:click={() => setTheme('dark')}>🌙 Dark</a></li>
            <li><a on:click={() => setTheme('cupcake')}>🧁 Cupcake</a></li>
        </ul>
    </div>
</div>