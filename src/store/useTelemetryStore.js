import { create } from 'zustand';

const generateNoise = (base, variance) => base + (Math.random() * variance * 2 - variance);

export const useTelemetryStore = create((set, get) => ({
  // 目前畫面正在查看的無人機
  selectedUnit: 'Unit-01',

  // 記錄哪一台無人機壞掉了 (null 代表全都正常)
  faultyUnit: null,

  telemetry: {
    health: 92,
    temperature: 58.5,
    soc: 78.2, 
    rul: 34,   
    motorRpm: 5800,
    vibration: 42.5,
  },
  
  history: [],

  // 切換目前查看的無人機
  setSelectedUnit: (unitName) => {
    // 取得當前的壞掉名單
    const { faultyUnit, telemetry } = get();
    
    // 如果切換過去的那台剛好是壞掉的，我們就保留異常的低健康度；如果不是，就給正常的數據
    const isThisUnitFaulty = (unitName === faultyUnit);
    
    set({
      selectedUnit: unitName,
      telemetry: { 
        ...telemetry, 
        health: isThisUnitFaulty ? telemetry.health : 92, // 保留壞掉的健康度，正常的恢復92
        temperature: isThisUnitFaulty ? telemetry.temperature : 58.5,
        rul: isThisUnitFaulty ? telemetry.rul : 34
      }
    });
  },

  tickSimulation: () => {
    const { telemetry, history, faultyUnit, selectedUnit } = get();
    
    // 檢查「現在畫面上這台」是不是壞掉的那台
    const isViewingFaultyUnit = (faultyUnit === selectedUnit);

    const newTemp = isViewingFaultyUnit 
      ? telemetry.temperature + 1.5 + Math.random() 
      : generateNoise(58, 2);                       

    const newHealth = isViewingFaultyUnit 
      ? Math.max(0, telemetry.health - 0.5) 
      : 92;

    const newTelemetry = {
      health: newHealth,
      temperature: Number(newTemp.toFixed(1)),
      soc: Math.max(0, Number((telemetry.soc - 0.05).toFixed(1))), 
      rul: isViewingFaultyUnit ? Math.max(0, telemetry.rul - 1) : 34,
      motorRpm: Number(generateNoise(isViewingFaultyUnit ? 5000 : 5800, isViewingFaultyUnit ? 800 : 100).toFixed(0)),
      vibration: Number(generateNoise(isViewingFaultyUnit ? 85 : 42, 5).toFixed(1)),
    };

    set({
      telemetry: newTelemetry,
      history: [...history, { time: new Date().toLocaleTimeString('en-US', {hour12: false}), ...newTelemetry }].slice(-20)
    });
  },

  triggerAnomaly: () => {
    // 隨機挑選一台倒霉的無人機
    const units = ['Unit-01', 'Unit-02', 'Unit-03', 'Unit-04', 'Unit-05'];
    const randomUnit = units[Math.floor(Math.random() * units.length)];
    
    // 將這台設為故障，並立刻把畫面切過去看它！
    set({ faultyUnit: randomUnit, selectedUnit: randomUnit });
  },

  resolveAnomaly: () => {
    // 修復完成，把壞掉名單清空，並把當前畫面的這台恢復健康
    set({ 
      faultyUnit: null, 
      telemetry: { ...get().telemetry, health: 92, temperature: 58.5, rul: 34 } 
    });
  }
}));