export function formatKRW(n: number): string {
  return n.toLocaleString('ko-KR') + '원'
}
