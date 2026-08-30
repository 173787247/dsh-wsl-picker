# dsh-wsl-picker

DeepSeek Harness tool: **`wsl_picker`** �?browse Linux directories including `/mnt` drives.

Counterpart (own implementation) to community [WilliamShi666/dsh-wsl-workspace-picker](https://github.com/WilliamShi666/dsh-wsl-workspace-picker).

Part of **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)**.

[中文说明 �?README.zh.md](./README.zh.md)

---

## Tool

| Arg | Required | Meaning |
|-----|----------|---------|
| `action` | yes | `roots` \| `list` |
| `path` | for `list` | Absolute Linux path |
| `showHidden` | no | Include dotfiles (default false) |

`roots` returns Home, `/`, `/mnt`, and existing `/mnt/[c-z]`.

`list` returns up to `maxEntries` (default 200) entries with `name`, `type` (`file`|`dir`), and `path`. Path traversal and non-absolute paths are rejected.

## Install

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-picker
```

## Config

```yaml
- id: dsh-wsl-picker
  name: dsh-wsl-picker
  config:
    timeoutMs: 15000
    maxEntries: 200
```

## Test

```sh
npm test
```

## License

MIT

Restart `dsh web` after installing so Tools lists the new plugin.
