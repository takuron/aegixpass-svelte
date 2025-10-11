<script lang="ts">
    import {onMount} from 'svelte';
    import {parseAndValidatePreset, type Preset} from '$lib/aegixpass';

    // 定义存储在 localStorage 中的键
    const CUSTOM_PRESET_STORAGE_KEY = 'aegixpass-custom-preset';

    // 编辑器的默认预设，仅在用户从未保存过自定义预设时使用
    const defaultCustomPreset: Preset = {
        name: 'Custom - Default',
        version: 1,
        hashAlgorithm: 'sha256',
        rngAlgorithm: 'chaCha20',
        shuffleAlgorithm: 'fisherYates',
        length: 16,
        platformId: 'aegixpass.takuron.com',
        charsets: [
            '0123456789',
            'abcdefghijklmnopqrstuvwxyz',
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            '!@#$%^&*_+-='
        ]
    };

    let presetJsonString = '';
    let errorMsg = '';
    let showSuccessAlert = false;
    let errorModal: HTMLDialogElement;

    // 在组件加载时，优先从 localStorage 加载，如果没有则使用默认值
    onMount(() => {
        const savedPreset = localStorage.getItem(CUSTOM_PRESET_STORAGE_KEY);
        if (savedPreset) {
            presetJsonString = savedPreset;
        } else {
            presetJsonString = JSON.stringify(defaultCustomPreset, null, 2);
        }
    });

    // 重置功能
    function handleReset() {
        showSuccessAlert = false;
        errorMsg = '';
        presetJsonString = JSON.stringify(defaultCustomPreset, null, 2);
    }

    // 保存时，将验证后的 JSON 字符串存入 localStorage
    function handleSave() {
        showSuccessAlert = false;
        try {
            // 使用我们之前创建的验证函数，确保预设对象结构正确
            const parsedPreset = parseAndValidatePreset(presetJsonString);

            const finalJsonString = JSON.stringify(parsedPreset, null, 2);

            // 存入 localStorage
            localStorage.setItem(CUSTOM_PRESET_STORAGE_KEY, finalJsonString);
            presetJsonString = finalJsonString; // 更新UI显示，确保名字也被更新

            errorMsg = '';
            showSuccessAlert = true;
            setTimeout(() => {
                showSuccessAlert = false;
            }, 2000);

        } catch (e) {
            errorMsg = '预设格式无效，请检查！ ' + (e as Error).message;
            errorModal.showModal();
        }
    }
</script>

<div class="card w-full max-w-2xl bg-base-100 shadow-xl">
    <div class="card-body">
        <h2 class="card-title">自定义预设编辑器</h2>
        <p class="text-base-content/70 mb-4">
            你可以在这里修改你的密码生成预设。点击保存后，它将出现在主页。
        </p>

        <div class="form-control">
			<textarea
                    bind:value={presetJsonString}
                    class="textarea textarea-bordered h-96 font-mono w-full"
                    placeholder="输入 JSON 格式的预设"
            />
        </div>

        {#if showSuccessAlert}
            <div role="alert" class="alert alert-success mt-4">
                <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="stroke-current shrink-0 h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                >
                    <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg
                >
                <span>预设已成功保存！</span>
            </div>
        {/if}

        <div class="card-actions justify-end mt-4">
            <button class="btn btn-ghost" on:click={handleReset}>重置</button>
            <button class="btn btn-primary" on:click={handleSave}>保存</button>
        </div>
    </div>
</div>

<dialog id="error_modal" class="modal" bind:this={errorModal}>
    <div class="modal-box">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="font-bold text-lg text-error">错误!</h3>
        <p class="py-4">{errorMsg}</p>
    </div>
</dialog>