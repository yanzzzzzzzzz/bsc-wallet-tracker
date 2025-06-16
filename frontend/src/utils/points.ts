export function getPowerOfTwo(num: number): number {
  if (num <= 0) return -1

  let power = 0
  while (num > 1) {
    num = Math.floor(num / 2)
    power++
  }

  return power
}

