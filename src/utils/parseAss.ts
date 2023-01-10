import { parse } from 'ass-compiler';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { TemplateMeta, AssMeta } from '../main';

export function parseAegisubMeta(content: string) {
  const lines = content.split(/\r\n|\n|\r/g);
  const metaHeaderIndex = lines.indexOf('[Aegisub Project Garbage]');
  const result: Record<string, string | undefined> = {};
  if (metaHeaderIndex >= 0) {
    for (let i = metaHeaderIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === '') break;
      const colonPos = line.indexOf(':');
      result[line.slice(0, colonPos).trim()] = line.slice(colonPos + 1).trim();
    }
  }
  return result;
}

function unescapeAssLine(str: string) {
  return str.replace(/\\([\\hNn])/g, (match, ch) => {
    if (ch === 'N' || ch === 'n') {
      return '\n';
    }
    if (ch === 'h') {
      return '\xA0';
    }
    if (ch === '\\') {
      return '\\';
    }
    return match;
  });
}

const metaBeginRegex = /#meta (.+)/i;
const metaLineRegex = /(.+?)=(.*)/i;
export function extractAssMeta(subtitleFile: string) {
  const assContent = readFileSync(subtitleFile, 'utf-8');
  const parsedAss = parse(assContent);
  const aegisubMeta = parseAegisubMeta(assContent);
  const videoFile =
    aegisubMeta['Video File'] &&
    resolvePath(subtitleFile, '..', aegisubMeta['Video File']);
  let metaStyle = '';
  let currentTemplateMeta: TemplateMeta = {};
  const assMeta: AssMeta = {
    subtitleFile,
    videoFile,
    template: '',
    templateOptions: currentTemplateMeta,
  };
  for (const event of parsedAss.events.comment) {
    const beginMatch = metaBeginRegex.exec(event.Text.raw);
    if (beginMatch !== null) {
      metaStyle = event.Style;
      currentTemplateMeta = {};
      assMeta.templateOptions = currentTemplateMeta;
      assMeta[beginMatch[1]] = currentTemplateMeta;
      if (assMeta.template === '') {
        assMeta.template = beginMatch[1];
      }
    } else if (metaStyle) {
      if (metaStyle === event.Style) {
        const lineMatch = metaLineRegex.exec(event.Text.raw);
        if (lineMatch) {
          currentTemplateMeta[lineMatch[1]] = unescapeAssLine(lineMatch[2]);
        }
      } else {
        metaStyle = '';
      }
    }
  }
  return assMeta;
}
