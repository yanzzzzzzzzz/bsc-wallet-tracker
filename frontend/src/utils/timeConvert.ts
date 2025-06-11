import dayjs from 'dayjs'
export function formatTimestamp(timestamp: number): string {
  return dayjs(timestamp * 1000).format('YYYY/MM/DD HH:mm:ss')
}
