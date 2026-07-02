export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getStatusTone(status) {
  if (status === 'Warning') return { chip: 'bg-red-500/15 text-red-300 border border-red-500/30', glow: '#ff4d6d' };
  if (status === 'Monitoring') return { chip: 'bg-amber-400/15 text-amber-200 border border-amber-400/30', glow: '#ffd166' };
  return { chip: 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/30', glow: '#37f29b' };
}

export function normalizeEvtolId(label) {
  const match = label.trim().toUpperCase().match(/^EVTOL-(\d+)$/);
  if (!match) return label.trim().toUpperCase();
  return `EVTOL-${match[1].padStart(2, '0')}`;
}

export function parseAnalysisItem(item = '') {
  const trimmed = item.trim();
  const withoutEmoji = trimmed.replace(/^[\u2705\u2714\u2716\u2717\u2718\u274C\u274E\u26A0\u26A0\uFE0F!x×✕✖]+\s*/i, '');
  let level = 'neutral';
  if (/^[✅✔]/.test(trimmed)) level = 'success';
  else if (/^[⚠!]/.test(trimmed)) level = 'warning';
  else if (/^[❌x×✕✖]/.test(trimmed)) level = 'danger';
  return { text: withoutEmoji, level };
}

export function parseAgentResponseFile(rawText) {
  const responses = {};
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blockPattern = /^evtol-(\d+):\s*$([\s\S]*?)(?=^evtol-\d+:|\s*$)/gim;
  let match;

  while ((match = blockPattern.exec(normalizedText)) !== null) {
    const label = `EVTOL-${match[1].padStart(2, '0')}`;
    const jsonText = match[2].trim().replace(/,\s*(?=[}\]])/g, '');
    if (!jsonText) continue;
    try {
      responses[label] = JSON.parse(jsonText);
    } catch (error) {
      console.warn('Failed to parse agent response block for', label, error.message);
    }
  }

  return responses;
}
