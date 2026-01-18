export function getParameterNames(func: (...args: any[]) => any): string[] {
  const stripped = func
    .toString()
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '')

  const args = stripped
    .slice(stripped.indexOf('(') + 1, stripped.indexOf(')'))
    .split(',')
    .map((arg) => arg.replace(/=[\s\S]*/, '').trim())
    .filter(Boolean)

  return args
}

/**
 * Detects which parameter indices use the spread operator (...args).
 * Returns an array of booleans where true means the parameter at that index is a spread parameter.
 */
export function getSpreadParameterIndices(func: (...args: any[]) => any): boolean[] {
  const stripped = func
    .toString()
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '')

  const argsString = stripped.slice(stripped.indexOf('(') + 1, stripped.indexOf(')'))
  const args = argsString
    .split(',')
    .map((arg) => arg.trim())
    .filter(Boolean)

  return args.map((arg) => arg.startsWith('...'))
}
