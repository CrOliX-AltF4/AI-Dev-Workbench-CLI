import { useState, useEffect } from 'react';
import os from 'os';
import type { SystemMetrics } from '../../types/index.js';

type CpuSample = { idle: number; total: number };

function sampleCpu(): CpuSample {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const val of Object.values(cpu.times)) {
      total += val;
    }
    idle += cpu.times.idle;
  }
  return {
    idle: cpus.length > 0 ? idle / cpus.length : 0,
    total: cpus.length > 0 ? total / cpus.length : 1,
  };
}

function readMemory(): Pick<SystemMetrics, 'memUsedMb' | 'memTotalMb'> {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    memTotalMb: Math.round(total / 1024 / 1024),
    memUsedMb: Math.round((total - free) / 1024 / 1024),
  };
}

export function useSystemMetrics(intervalMs = 2000): SystemMetrics {
  const [metrics, setMetrics] = useState<SystemMetrics>(() => ({
    cpuUsagePercent: 0,
    ...readMemory(),
    timestamp: Date.now(),
  }));

  useEffect(() => {
    let prev = sampleCpu();

    const timer = setInterval(() => {
      const curr = sampleCpu();
      const idleDiff = curr.idle - prev.idle;
      const totalDiff = curr.total - prev.total;
      const cpu = totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100);
      prev = curr;

      setMetrics({
        cpuUsagePercent: Math.max(0, Math.min(100, cpu)),
        ...readMemory(),
        timestamp: Date.now(),
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return metrics;
}
