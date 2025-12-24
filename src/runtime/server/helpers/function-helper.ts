export function getParameterNames(func: Function): string[] {
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
