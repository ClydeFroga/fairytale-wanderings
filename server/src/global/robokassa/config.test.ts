import { describe, it, expect, afterEach, spyOn } from 'bun:test'
import { getRobokassaConfig } from './config'
import { clearRobokassaEnv, setRobokassaEnv } from '../../test/e2e/robokassa'

describe('robokassa config', () => {
  afterEach(() => {
    clearRobokassaEnv()
  })

  it('кривой ROBOKASSA_HASH — md5 и одно предупреждение, а не на каждый запрос', () => {
    // Значение уникально для теста: предупреждение помнит, о чём уже говорило.
    setRobokassaEnv({ ROBOKASSA_HASH: 'crc32-config-test' })
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (let i = 0; i < 3; i++) expect(getRobokassaConfig()?.hash).toBe('md5')

      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]![0])).toContain('crc32-config-test')
    } finally {
      warn.mockRestore()
    }
  })
})
