'use client';

import { useState, useEffect } from 'react';

interface DebugEvent {
  timestamp: string;
  type: string;
  event?: any;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function MonitorDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // 从 localStorage 读取调试信息
    const storedEvents = localStorage.getItem('monitor_debug_events');
    const storedConfig = localStorage.getItem('monitor_debug_config');
    
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
    if (storedConfig) {
      setConfig(JSON.parse(storedConfig));
    }

    // 监听自定义事件
    const handleDebugEvent = (e: CustomEvent<DebugEvent>) => {
      setEvents(prev => {
        const newEvents = [...prev, e.detail].slice(-50); // 保留最近 50 条
        localStorage.setItem('monitor_debug_events', JSON.stringify(newEvents));
        return newEvents;
      });
    };

    const handleConfig = (e: CustomEvent) => {
      setConfig(e.detail);
      localStorage.setItem('monitor_debug_config', JSON.stringify(e.detail));
    };

    window.addEventListener('monitor_debug_event' as any, handleDebugEvent as any);
    window.addEventListener('monitor_debug_config' as any, handleConfig);

    return () => {
      window.removeEventListener('monitor_debug_event' as any, handleDebugEvent as any);
      window.removeEventListener('monitor_debug_config' as any, handleConfig);
    };
  }, []);

  const clearEvents = () => {
    setEvents([]);
    localStorage.removeItem('monitor_debug_events');
  };

  const clearConfig = () => {
    setConfig(null);
    localStorage.removeItem('monitor_debug_config');
  };

  return (
    <>
      {/* 调试按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition"
      >
        🔍 Monitor Debug
      </button>

      {/* 调试面板 */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[80vh] overflow-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">Monitor 调试信息</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* 配置信息 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-gray-700">环境配置</h4>
                <button
                  onClick={clearConfig}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  清除
                </button>
              </div>
              {config ? (
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(config, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-gray-500">暂无配置信息</p>
              )}
            </div>

            {/* 事件日志 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm text-gray-700">
                  事件日志 ({events.length})
                </h4>
                <button
                  onClick={clearEvents}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  清除
                </button>
              </div>
              {events.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-auto">
                  {events.slice().reverse().map((event, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded text-xs border-l-4 ${
                        event.status === 'success'
                          ? 'bg-green-50 border-green-500'
                          : event.status === 'error'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-yellow-50 border-yellow-500'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{event.type}</span>
                        <span className="text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.message && (
                        <div className="text-gray-600 mt-1">{event.message}</div>
                      )}
                      {event.event && (
                        <pre className="mt-1 text-gray-500 overflow-auto">
                          {JSON.stringify(event.event, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">暂无事件日志</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}