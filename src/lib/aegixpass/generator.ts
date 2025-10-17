import type { Preset } from './types';
import { AegixPassError } from './types';

// 导出这个函数，以便在我们的 Svelte 组件中使用
export function aegixPassGeneratorAsync(
    masterPassword: string,
    siteKey: string,
    preset: Preset
): Promise<string> {

    // 返回一个新的 Promise，这是将回调模式转换为 async/await 模式的关键
    return new Promise((resolve, reject) => {
        // 创建一个新的 Worker 实例
        // Vite 会处理这个路径，确保它能正确加载
        const worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module'
        });

        // 监听来自 Worker 的消息
        worker.onmessage = (event) => {
            const { type, payload } = event.data;

            if (type === 'SUCCESS') {
                resolve(payload); // 成功时，Promise 完成，返回密码
            } else if (type === 'ERROR') {
                // 失败时，重建错误对象并拒绝 Promise
                const error = new AegixPassError(payload.message);
                error.name = payload.name || 'AegixPassError';
                reject(error);
            }

            // 任务完成后，无论成功或失败，都终止 Worker 以释放资源
            worker.terminate();
        };

        // 监听 Worker 自身的加载或执行错误
        worker.onerror = (error) => {
            console.error("Worker critical error:", error);
            reject(new AegixPassError('Worker failed to execute. This might be a bundling or browser issue.'));
            worker.terminate(); // 同样要终止
        };

        // 将任务数据发送给 Worker，开始执行
        worker.postMessage({
            masterPassword,
            siteKey,
            preset
        });
    });
}