export function getPowerOfTwo(num: number): number {
  if (num <= 0) return -1

  let power = 0
  while (num > 1) {
    num = Math.floor(num / 2)
    power++
  }

  return power
}

export function getNextPowerOfTwo(num: number): number {
  if (num <= 0) return 1

  let power = getPowerOfTwo(num)

  if (Math.pow(2, power) === num) {
    return Math.pow(2, power + 1)
  }
  return Math.pow(2, power + 1)
}
