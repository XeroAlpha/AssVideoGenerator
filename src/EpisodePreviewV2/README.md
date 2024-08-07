# 番剧预告模块 V2

压制指定的预告视频，在视频开头或末尾加上包含本话相关信息的“尾巴”，防止被 B 站判定撞车。

此外还可将预告视频自身嵌入至尾巴中，防止被 B 站因版权原因导致锁定。

| 参数名        | 必需 | 描述                               |
| ------------- | ---- | ---------------------------------- |
| `images`      | 是   | 先行图文件名列表                   |
| `background`  | 否   | 背景图片                           |
| `episodeName` | 是   | 话次                               |
| `title`       | 是   | 本话标题                           |
| `description` | 是   | 本话描述                           |
| `staff`       | 否   | 本话制作人员                       |
| `info`        | 否   | 本话播出信息                       |
| `interval`    | 是   | 先行图展示间隔                     |
| `transition`  | 是   | 过渡时间                           |
| `ending`      | 否   | 结尾过渡时间                       |
| `bgm`         | 否   | 背景音乐                           |
| `bgm.start`   | 否   | 背景音乐入点                       |
| `fps`         | 否   | 重设 FPS                           |
| `position`    | 否   | 该部分生成视频相对于预告视频的位置 |
| `embedVideo`  | 否   | 将预告视频嵌入生成视频内一起生成   |
| `previewOnly` | 否   | 不嵌入或连接预告视频               |
| `css.<类名>`  | 否   | 自定义 CSS 类                      |
