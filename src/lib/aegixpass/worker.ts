// 导入核心的生成器函数和类型
import { aegixPassGenerator, AegixPassError } from '$lib/aegixpass';

/**
 * 监听来自主线程的消息。
 * event.data 包含了主线程发送过来的数据对象。
 */
self.onmessage = async (event) => {
    const { masterPassword, siteKey, preset } = event.data;

    try {
        // 在 Worker 线程中执行耗时的计算
        const generatedPassword = await aegixPassGenerator(masterPassword, siteKey, preset);

        // 计算成功后，将结果发送回主线程
        self.postMessage({ type: 'SUCCESS', payload: generatedPassword });

    } catch (e) {
        // 如果发生错误，将错误信息序列化后发送回主线程
        let errorPayload;
        if (e instanceof AegixPassError) {
            errorPayload = { name: e.name, message: e.message };
        } else if (e instanceof Error) {
            errorPayload = { name: e.name, message: e.message };
        } else {
            errorPayload = { message: 'An unknown error occurred in the worker.' };
        }
        self.postMessage({ type: 'ERROR', payload: errorPayload });
    }
};