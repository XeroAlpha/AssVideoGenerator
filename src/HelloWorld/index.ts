import { resolve as resolvePath } from 'path';
import { render } from '../jobs/render';
import { AssMeta, RenderContext, RenderTemplate } from '../main';
import { withExtension } from '../utils/fileExtensions';

function getRenderOptions(cx: RenderContext, meta: AssMeta) {
  return {
    entryPoint: resolvePath(__dirname, 'Video.tsx'),
    compositionId: 'HelloWorld',
    inputProps: {
      titleText: meta.templateOptions.title,
    },
  };
}

export const HelloWorldTemplate: RenderTemplate = {
  preview: getRenderOptions,
  render(cx, meta) {
    const renderOptions = getRenderOptions(cx, meta);
    return render(cx, renderOptions, withExtension(meta.subtitleFile, '.subtitle.mp4'));
  },
};
