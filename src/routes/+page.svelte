<script lang="ts">
    import { onMount } from 'svelte';
    import {
        aegixPassGenerator,
        loadBuiltInPresets,
        AegixPassError,
        type Preset,
    } from '$lib/aegixpass';

    let masterPassword = '';
    let siteKey = '';
    let availablePresets: Preset[] = [];
    let selectedPreset: Preset | undefined;
    let generatedPassword = '';
    let errorMsg = '';
    let isLoading = false;
    let copySuccess = false;

    onMount(() => {
        availablePresets = loadBuiltInPresets();
        if (availablePresets.length > 0) {
            selectedPreset = availablePresets[0];
        }
    });

    async function handleGenerate() {
        if (!masterPassword || !siteKey) {
            return;
        }

        generatedPassword = '';
        isLoading = true;

        try {
            generatedPassword = await aegixPassGenerator(
                masterPassword,
                siteKey,
                selectedPreset as Preset
            );
        } catch (e) {
            console.error(e);
            if (e instanceof AegixPassError) {
                // Handle error
            }
        } finally {
            isLoading = false;
        }
    }

    function handleCopy() {
        if (!generatedPassword) return;
        navigator.clipboard.writeText(generatedPassword).then(() => {
            copySuccess = true;
            setTimeout(() => (copySuccess = false), 2000);
        });
    }
</script>

<div class="card w-full max-w-lg bg-base-100 shadow-xl transition-all">
    <form class="card-body" on:submit|preventDefault={handleGenerate}>
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
            <select bind:value={selectedPreset} class="select select-bordered w-full">
                {#each availablePresets as preset (preset.name)}
                    <option value={preset}>{preset.name}</option>
                {/each}
            </select>
        </div>

        <div class="card-actions justify-end mt-6">
            <button
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
                            type="button"
                    >
                        {copySuccess ? '✅ 已复制' : '📋 复制'}
                    </button>
                </div>
            </div>
        {/if}
    </form>
</div>