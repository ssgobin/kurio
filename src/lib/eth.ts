const SCALE = 1_000_000n;

export function parseEth(value: string | number): bigint {
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error(`Valor ETH inválido: ${raw}`);
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '000000').slice(0, 6));
}

export function formatEthUnits(units: bigint, decimals = 3): string {
  const sign = units < 0n ? '-' : '';
  const abs = units < 0n ? -units : units;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(6, '0').slice(0, decimals);
  return decimals > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

export function normalizeEth(value: string | number, decimals = 2): string {
  return formatEthUnits(parseEth(value), decimals);
}

export function multiplyEth(value: string, quantity: number): bigint {
  return parseEth(value) * BigInt(quantity);
}

export function sumEth(values: bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

export function percentOf(units: bigint, basisPoints: number): bigint {
  return (units * BigInt(basisPoints)) / 10_000n;
}
