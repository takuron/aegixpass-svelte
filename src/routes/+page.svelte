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
  // 在 Svelte 中，普通变量默认就是响应式的
  let masterPassword = '';
  let siteKey = '';
  
  let availablePresets: Preset[] = [];
  // `selectedPreset` 需要特别注意，我们会绑定整个对象
  let selectedPreset: Preset | undefined;

  let generatedPassword = '';
  let errorMsg = '';
  let isLoading = false;

  // --- 3. 组件加载时执行的逻辑 ---
  // onMount 是 Svelte 的生命周期函数，等同于 Vue 的 onMounted
  onMount(() => {
    availablePresets = loadBuiltInPresets();
    if (availablePresets.length > 0) {
      selectedPreset = availablePresets[0];
    }
  });

  // --- 4. “生成密码”按钮的点击事件处理函数 ---
  async function handleGenerate() {
    // a. 先进行输入验证
    if (!selectedPreset) {
      errorMsg = '请先选择一个预设配置！';
      return;
    }
    if (!masterPassword || !siteKey) {
      errorMsg = '主密码和区分密钥不能为空！';
      return;
    }

    // b. 进入生成流程，重置状态
    errorMsg = '';
    generatedPassword = '';
    isLoading = true;

    try {
      // c. 调用核心算法
      const password = await aegixPassGenerator(
        masterPassword,
        siteKey,
        selectedPreset
      );
      generatedPassword = password;
    } catch (e) {
      // d. 捕获并处理可能发生的错误
      if (e instanceof AegixPassError) {
        errorMsg = `算法错误: ${e.message}`;
      } else {
        errorMsg = '发生未知错误，请检查控制台。';
        console.error(e);
      }
    } finally {
      // e. 无论成功还是失败，最后都要结束加载状态
      isLoading = false;
    }
  }
</script>

<div class="drawer drawer-mobile bg-base-200">
  <input id="my-drawer" type="checkbox" class="drawer-toggle" />

  <div class="drawer-content flex flex-col items-center justify-center">
    <label for="my-drawer" class="btn btn-primary drawer-button lg:hidden absolute top-4 left-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
    </label>

    <div class="card w-full max-w-lg bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl">AegixPass 密码生成器 (Svelte版)</h2>

        <div class="form-control w-full">
          <label class="label" for="master-password">
            <span class="label-text">主密码 (Master Password)</span>
          </label>
          <input
            id="master-password"
            bind:value={masterPassword}
            type="password"
            placeholder="请输入你的主密码"
            class="input input-bordered w-full"
          />
        </div>

        <div class="form-control w-full">
          <label class="label" for="site-key">
            <span class="label-text">区分密钥 (e.g., example.com)</span>
          </label>
          <input
            id="site-key"
            bind:value={siteKey}
            type="text"
            placeholder="例如：google.com, github.com"
            class="input input-bordered w-full"
          />
        </div>

        <div class="form-control w-full">
          <label class="label" for="preset-select">
            <span class="label-text">选择预设配置</span>
          </label>
          <select id="preset-select" bind:value={selectedPreset} class="select select-bordered">
            {#each availablePresets as preset (preset.name)}
              <option value={preset}>
                {preset.name}
              </option>
            {/each}
          </select>
        </div>

        <div class="card-actions justify-end mt-4">
          <button
            on:click={handleGenerate}
            class="btn btn-primary w-full"
            class:loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '正在生成...' : '生成密码'}
          </button>
        </div>

        {#if generatedPassword}
          <div class="mt-4">
            <label class="label">
              <span class="label-text">生成的密码:</span>
            </label>
            <div class="mockup-code">
              <pre><code>{generatedPassword}</code></pre>
            </div>
          </div>
        {/if}

        {#if errorMsg}
          <div class="alert alert-error shadow-lg mt-4">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{errorMsg}</span>
            </div>
          </div>
        {/if}

      </div>
    </div>
  </div>

  <div class="drawer-side">
    <label for="my-drawer" class="drawer-overlay"></label>
    <ul class="menu p-4 w-80 bg-base-100 text-base-content">
      <li class="menu-title">
        <span>AegixPass</span>
      </li>
      <li><a>首页</a></li>
      <li><a>算法介绍</a></li>
      <li><a>自定义预设</a></li>
    </ul>
  </div>
</div>
