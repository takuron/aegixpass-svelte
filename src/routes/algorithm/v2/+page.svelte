<script lang="ts">
    export let data;
</script>

<svelte:head>
    <title>AegixPass - 安全、免费、开源的确定性密码派生工具 | V2 算法介绍（推荐）</title>
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
