// Real endpoints return only the slice they changed (see docs/api-contract.md), but every
// src/api/*.js function must keep returning the FULL user record — same as the mock's
// request() — so DataProvider.run()'s setRec(result) and every page component stay untouched.
// This module keeps the last-known full record in memory (populated by authApi.getBundle) and
// merges each slice response into it before handing the merged record back.

let cache = null

export function setBundle(bundle) {
  cache = bundle
  return cache
}

export function getCachedBundle() {
  return cache
}

// path: 'profile' or 'profile.skills' — dot path into the cached record to replace with `slice`.
export function mergeSlice(path, slice) {
  if (!cache) throw new Error(`Bundle not loaded yet — call getBundle() before ${path}`)
  const keys = path.split('.')
  const next = { ...cache }
  let cursor = next
  for (let i = 0; i < keys.length - 1; i++) {
    cursor[keys[i]] = { ...cursor[keys[i]] }
    cursor = cursor[keys[i]]
  }
  cursor[keys[keys.length - 1]] = slice
  cache = next
  return cache
}
