import { describe, expect, it } from 'vitest';
import { requireGroup, requireUserId } from '../lambda/common/auth';
import { ApiError } from '../lambda/common/http';
import { fakeEvent } from './helpers';

describe('requireUserId', () => {
  it('reads the sub claim the JWT authorizer attached', () => {
    const event = fakeEvent({ method: 'GET', path: '/me/bundle', userId: 'user-42' });
    expect(requireUserId(event)).toBe('user-42');
  });

  it('throws 401 when the claim is missing', () => {
    const event = fakeEvent({ method: 'GET', path: '/me/bundle' });
    // @ts-expect-error simulate a malformed/missing authorizer context
    event.requestContext.authorizer.jwt.claims.sub = undefined;
    expect(() => requireUserId(event)).toThrow(ApiError);
  });
});

describe('requireGroup', () => {
  it('passes when the user is in the required group', () => {
    const event = fakeEvent({ method: 'POST', path: '/recruiter/roles', groups: ['company'] });
    expect(() => requireGroup(event, 'company')).not.toThrow();
  });

  it('throws 403 when the user is not in the required group', () => {
    const event = fakeEvent({ method: 'POST', path: '/recruiter/roles', groups: ['student'] });
    expect(() => requireGroup(event, 'company')).toThrow(ApiError);
  });
});
