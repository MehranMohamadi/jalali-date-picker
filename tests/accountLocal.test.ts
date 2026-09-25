import { describe, expect, it } from 'vitest'
import { localAccountKey, planLocalAccountSwitch } from '../src/utils/accountLocal'

describe('device data on account changes', () => {
  it('claims existing anonymous data for a first account without uploading it', () => {
    expect(planLocalAccountSwitch('', 'alice', 'device-data', null, 'empty')).toEqual({
      saves: [[localAccountKey(''), 'empty'], [localAccountKey('alice'), 'device-data']],
      restore: null,
    })
  })

  it('restores each account separately and clears the view for a new account', () => {
    expect(planLocalAccountSwitch('alice', 'bob', 'alice-data', null, 'empty')).toEqual({
      saves: [[localAccountKey('alice'), 'alice-data']], restore: 'empty',
    })
    expect(planLocalAccountSwitch('bob', 'alice', 'bob-data', 'alice-data', 'empty')).toEqual({
      saves: [[localAccountKey('bob'), 'bob-data']], restore: 'alice-data',
    })
  })

  it('restores the signed-out device view on logout', () => {
    expect(planLocalAccountSwitch('alice', '', 'alice-data', 'empty', 'empty')).toEqual({
      saves: [[localAccountKey('alice'), 'alice-data']], restore: 'empty',
    })
  })
})
