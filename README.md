# Kal-tist

老猫桌宠：凯尔希·思衡托 Windows 骨骼桌宠。当前源码来自已应用的 v16，动画为 Spine only v11；Windows 安装版本为 2.16.0。

![人物图标](app/assets/theme/esperanta-app.png)

## 功能

- Spine 骨骼动画、原生呼吸/眨眼/耳朵动效、鼠标眼追、拖动换向、自由缩放。
- Relax/Sit 随机待机、五分钟入睡、经 Relax 的骨骼睡眠过渡、触摸互动、托腮思考和加载指示。
- 液态玻璃气泡、任务选择、可调颜色与透明度、独立音乐框、三种对话模式界面。
- Codex 任务监测、指令和回复；兼容客户端上的 ChatGPT 聊天/工作会话桥接。
- 网易云歌名、歌手、封面、进度和播放控制；真实可用能力由本机客户端接口决定。

## 支持与限制

支持 Windows 10 22H2 / Windows 11，Intel/AMD x64。本仓库未提供 macOS/Linux 安装方案。已在开发机器验证安装、普通和软件渲染、卸载及部分集成；跨硬件与混合 DPI 多屏尚未实机验证。

Codex/网易云需自行安装并登录。网易云完整控制曾在 3.1.40 上验证，其本地连接限定 127.0.0.1:19263。客户端升级可能需要适配。

ChatGPT/工作模式复用版本敏感的本地客户端入口；需真实本机调用上下文和用户选择的会话，不会随仓库迁移。未配置时会明确提示。发送结果不明确时不自动重发。详见 [桥接说明](docs/chatgpt-bridge.md)。

## 开发运行

安装 Node.js 和 npm 后，在仓库目录执行：

```powershell
npm install
npm start
```

首次安装会下载 Electron 44.4.5，依赖下载网络可达性。开发运行配置写入仓库 `data` 目录，已被 Git 忽略。要使用开发版“随 Codex 启动”和 VBS 启动入口，需要完整 Windows x64 Electron 解压目录位于 `runtime`（通常可使用 npm 安装后的 `node_modules/electron/dist`）。

## 构建 Windows 安装包

需要 Windows x64、.NET Framework 4.8、PowerShell 5.1、Electron 44.4.5 完整运行时与 Inno Setup 6。编译器应通过 [Inno Setup 官方网站](https://jrsoftware.org/isinfo.php)获取。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\build.ps1 `
  -RuntimeDirectory .\node_modules\electron\dist `
  -InnoCompiler "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
```

使用新构建目录：`prepare.ps1` 遇到已有 `payload` 会停止，避免混入旧文件。产物为 `packaging/windows/dist` 下的安装包与 SHA-256 校验文件。

安装版独立保存用户数据，提供部署环境检查、自启动、软件渲染和保留配置的卸载。当前构建没有代码签名，不能视为已签名发行版。部署说明位于 [packaging/windows/resources/部署须知.txt](packaging/windows/resources/部署须知.txt)。

## 仓库内容

`app` 保留正式程序源码及模型/主题素材；`packaging/windows` 保存安装器、启动器和环境检测源码。运行库、历史候选、失败实验、调试截图/报告、私人会话与配置不入库。GitHub 仓库用于维护可复现源码，不包含旧工作区的整套历史归档或预编译安装器。

## 许可

程序代码按 [GPL-3.0](LICENSE) 说明提供；随附第三方代码保留原许可，见 `app/licenses`、Spine 运行库文件头及 [第三方说明](packaging/windows/resources/THIRD-PARTY-NOTICES.txt)。角色美术、签名和 GPT 标志各自保留原权利，程序许可不授予其独立使用或再分发权限。
