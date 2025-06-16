import dayjs from 'dayjs'
export function formatTimestamp(timestamp: number): string {
  return dayjs(timestamp * 1000).format('HH:mm:ss')
}
