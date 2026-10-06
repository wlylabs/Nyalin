/** Utilitas teks kecil untuk tampilan. */

const formatter = new Intl.NumberFormat('id-ID');
export const formatNumber = (n: number) => formatter.format(n);

/** Potongan singkat untuk daftar riwayat. */
export function excerpt(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/\s+\S*$/, '')}…`;
}
