import { describe, expect, it } from 'vitest';

import { can, canSwitchRole, checkGmWord, newAccount, permissionsOf, ROLES } from './roles';

describe('roles', () => {
  it('игрок ничего не может, админ может всё', () => {
    expect(permissionsOf('player')).toEqual([]);
    expect(can('player', 'chat.moderate')).toBe(false);
    expect(can('moderator', 'chat.moderate')).toBe(true);
    expect(can('moderator', 'player.grant')).toBe(false);
    expect(can('gm', 'player.grant')).toBe(true);
    expect(can('gm', 'role.assign')).toBe(false);
    for (const p of permissionsOf('gm')) expect(can('admin', p)).toBe(true);
    expect(can('admin', 'save.reset')).toBe(true);
  });

  it('слово ключника открывает смену роли', () => {
    const acc = newAccount();
    expect(canSwitchRole(acc, 'gm').ok).toBe(false);
    expect(checkGmWord('kлючник').ok).toBe(false);
    expect(checkGmWord('  Ключник ').ok).toBe(true);
    expect(canSwitchRole({ ...acc, gmUnlocked: true }, 'gm').ok).toBe(true);
    expect(canSwitchRole({ role: 'admin', gmUnlocked: false }, 'player').ok).toBe(true);
    expect(ROLES).toHaveLength(4);
  });
});
