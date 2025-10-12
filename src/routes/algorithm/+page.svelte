<script lang="ts">
    // This component now only receives data from its corresponding `+page.ts`.
    // It has no knowledge of where the data came from or how it was loaded.
    export let data;
</script>

<svelte:head>
    <title>AegixPass - 安全、免费、开源的确定性密码派生工具 | 算法介绍</title>
</svelte:head>

<div class="prose w-full max-w-6xl bg-base-100 p-8 rounded-box shadow-xl">
    {@html data.content}
</div>

<style>
    :global(.prose pre) {
        white-space: pre-wrap;
        word-break: break-all;
    }
</style>