export function findSeparatorLine(lines: string[], separator: string = '---'): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === separator) {
      return i;
    }
  }
  return -1;
}

export function findHeaderKeyLine(lines: string[], key: string): number {
  const separatorLine = findSeparatorLine(lines);
  const end = separatorLine >= 0 ? separatorLine : lines.length;

  for (let i = 0; i < end; i++) {
    if (lines[i].trimStart().startsWith(`${key}:`)) {
      return i;
    }
  }

  return 0;
}

export function findCommandLine(lines: string[], key: string, startLine: number): number {
  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (
      trimmed.startsWith(`- ${key}:`) ||
      trimmed.startsWith(`- ${key}`) ||
      trimmed === `- ${key}`
    ) {
      return i;
    }
  }

  return startLine;
}

export function findPropertyLine(lines: string[], key: string, startLine: number): number {
  for (let i = startLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('- ')) {
      break;
    }

    if (trimmed.startsWith(`${key}:`)) {
      return i;
    }
  }

  return startLine;
}

export function findKeyLine(lines: string[], key: string, startLine: number = 0): number {
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith(`${key}:`)) {
      return i;
    }
  }

  return 0;
}
