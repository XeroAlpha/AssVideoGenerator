# AssVideoGenerator

读取 ASS 文件，在压制视频的同时生成一个小尾巴防止被哔哩哔哩判定撞车以及版权原因的锁定。

## 使用方式

```shell
yarn run preview <ass path>
# 打开浏览器预览 ass 的尾巴部分。

yarn run render <ass path>
# 将 ass 与压制到视频中，并加上尾巴。
```

## ASS 格式

在 ASS 的任意处加入一行注释 `#meta <模板名称>` 即可启用。

紧跟在该行注释下且相同样式的行会被解释为模板的参数。参数格式为 `<参数名>=<值>`。参数名不可重复，以任意顺序给出均可。

以下是一个将视频源的帧率提升至 60 FPS，再加上字幕的模块。

```
#meta default
fps=60
```

## 模块列表

### 默认模块

`#meta default`

从 ASS 文件中读取链接的视频文件，将字幕压制到视频文件的视频流中，保留音频流不变。

输出视频文件保存在字幕文件目录下 `<字幕文件名>.subtitle.mp4` 中。若文件已存在则覆盖。

此模块不支持预览。

如果没有找到对应名称的模块，则使用此模块。

|参数名|必需|描述|
|---|---|---|
|`fps`|否|压制字幕前将视频帧率以重复帧/丢帧的方式提升/降低至设定的帧率|
|`supersampling`|否|压制字幕前将视频放大设定倍数，压制结束后再缩小设定倍数|
|`iargs:<输入参数>`|否|提供给 FFmpeg 的输入参数|
|`args:<输出参数>`|否|提供给 FFmpeg 的输出参数|

例如，当给出参数 `iargs:r=30` 时，模块会向 FFmpeg 提供 `-r 30` 的输入参数。

示例：以 60 FPS 进行压制，并设置指定的输出参数。
```
#meta default
fps=60
args:crf=18
args:preset=veryslow
args:profile:v=high422
args:level=1.3
args:tune:v=animation
```

### 多重渲染模块

`#meta multi-render`

将同一个字幕文件压制到不同的视频源中。

此模块不支持预览。

|参数名|必需|描述|
|---|---|---|
|`profiles`|是|以 `,` 分隔的配置名称列表|
|`overwrite`|否|若为 `yes`，无论是否存在输出视频文件都进行覆盖，否则若已存在就跳过对应配置|
|`<配置名>:src`|否|输入视频文件，支持相对于字幕文件夹的路径|
|`<配置名>:out`|否|输出视频文件，支持相对于字幕文件夹的路径|
|`<配置名>:fps`|否||
|`<配置名>:supersampling`|否||
|`<配置名>:iargs:<输入参数>`|否||
|`<配置名>:args:<输出参数>`|否||

`fps`、`supersampling`、`iargs`、`args` 参数格式与默认模块相同。

示例：同时压制 OP.mp4 与 NCOP.mp4。
```
#meta multi-render
profiles=op,ncop
overwrite=yes
op:src=OP.mp4
op:out=OP.subtitle.mp4
ncop:src=NCOP.mp4
ncop:out=NCOP.subtitle.mp4
```

### 番剧PV模块

`#meta bangumi-pv`

模块重构 & 文档编写中……

### 番剧预告模块

`#meta episode-preview`

压制指定的预告视频，在视频末尾加上尾巴，防止被B站判定撞车。

此模块已弃用，请使用 [episode-preview-v2](#番剧预告模块V2)。

### 番剧预告模块V2

`#meta episode-preview-v2`

压制指定的预告视频，在视频开头或末尾加上尾巴，防止被B站判定撞车。此外还可将视频嵌入至尾巴中，防止被B站因版权原因导致锁定。

参数格式与详细用法请参见：[番剧预告模块V2](./src/EpisodePreviewV2/README.md)。
