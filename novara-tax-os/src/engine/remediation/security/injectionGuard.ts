/**
 * Injection defenses for staging APIs — parameterized-style validation, no raw concatenation.
 */

export function assertSafeIdentifier(value: string, label = 'id'): string {
  if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(value)) {
    throw new Error(`unsafe_${label}`)
  }
  return value
}

export function assertNoSqlMeta(value: string): string {
  if (/[;'"\\]|--|\/\*|\*\//.test(value)) {
    throw new Error('sql_meta_rejected')
  }
  return value
}

export function assertNoPathTraversal(value: string): string {
  if (value.includes('..') || value.includes('\\') || value.startsWith('/')) {
    throw new Error('path_traversal_rejected')
  }
  return value
}
