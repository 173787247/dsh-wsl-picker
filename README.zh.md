# dsh-wsl-picker

DeepSeek Harness 工具：**`wsl_picker`** — 浏览 Linux 目录（含 `/mnt` 盘符）。

对应社区 [WilliamShi666/dsh-wsl-workspace-picker](https://github.com/WilliamShi666/dsh-wsl-workspace-picker) 的自有实现。

属于 **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)**。

[English → README.md](./README.md)

---

## 工具参数

| 参数 | 必需 | 含义 |
|------|------|------|
| `action` | 是 | `roots` \| `list` |
| `path` | `list` | 绝对 Linux 路径 |
| `showHidden` | 否 | 是否显示隐藏文件 |

`roots` 返回 Home、`/`、`/mnt` 以及已存在的 `/mnt/[c-z]`。

`list` 最多返回 `maxEntries`（默认 200）条，含 `name` / `type` / `path`。拒绝路径穿越与非绝对路径。

## 安装

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-picker
```

## 配置

```yaml
- id: dsh-wsl-picker
  name: dsh-wsl-picker
  config:
    timeoutMs: 15000
    maxEntries: 200
```

## 测试

```sh
npm test
```

## 许可

MIT
