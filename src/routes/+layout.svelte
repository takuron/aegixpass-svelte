<script lang="ts">
    import {onMount} from 'svelte';
    import { page } from '$app/state';
    import '../app.css';
    import logo from '$lib/assets/logo.png';

    let isDarkMode = false;

    onMount(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            isDarkMode = savedTheme === 'dark';
        } else {
            isDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
        }
        applyTheme();
    });

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        applyTheme();
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }

    function applyTheme() {
        const theme = isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }
</script>

<div class="drawer lg:drawer-open bg-base-200 min-h-screen">
    <input id="my-drawer" type="checkbox" class="drawer-toggle"/>

    <div class="drawer-content flex flex-col items-center justify-center p-4">
        <label for="my-drawer" class="btn btn-primary drawer-button lg:hidden absolute top-4 left-4 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </label>
        <slot/>
    </div>

    <div class="drawer-side">
        <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>

        <div class="menu p-4 w-80 min-h-full bg-base-100 text-base-content flex flex-col justify-between">
            <div>
                <div class="flex items-center gap-2 p-4">
                    <img src={logo} alt="AegixPass Logo" class="w-10 h-10"/>
                    <a href="/" class="text-xl font-bold">AegixPass</a>
                </div>
                <ul>
                    <li><a href="/" class:menu-active={page.url.pathname === '/'}>首页</a></li>
                    <li><a href="/custom-presets" class:menu-active={page.url.pathname === '/custom-presets'}>自定义预设</a></li>
                    <li><a href="/algorithm" class:menu-active={page.url.pathname === '/algorithm'}>算法介绍</a></li>
                </ul>
            </div>

            <div>
                <div class="p-2 flex justify-between items-center">
                    <span class="label-text">暗色模式</span>
                    <input
                            type="checkbox"
                            class="toggle toggle-primary"
                            on:change={toggleTheme}
                            bind:checked={isDarkMode}
                    />
                </div>

                <footer class="p-4 text-center text-xs text-base-content/60">
                    <a href="https://github.com/takuron/aegixpass-svelte" target="_blank" rel="noopener noreferrer"
                       class="link link-hover">
                        GitHub
                    </a> |
                    <a href="https://takuron.com/" target="_blank" rel="noopener noreferrer" class="link link-hover">
                        Takuron's Blog
                    </a>
                </footer>
            </div>
        </div>
    </div>
</div>