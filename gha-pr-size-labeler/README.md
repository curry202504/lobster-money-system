# PR Size Labeler

Automatically label pull requests based on the number of lines changed.

## Usage

```yaml
name: PR Size Label
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: lobster-dev/pr-size-labeler@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          xs-max: 10       # 0-10 lines → XS
          s-max: 50        # 11-50 → S
          m-max: 200       # 51-200 → M
          l-max: 500       # 201-500 → L
          # >500 → XL
```

## Labels Applied

| Size | Lines Changed | Label |
|------|---------------|-------|
| XS   | 1-10          | `size/xs` |
| S    | 11-50         | `size/s` |
| M    | 51-200        | `size/m` |
| L    | 201-500       | `size/l` |
| XL   | 500+          | `size/xl` |

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | ✅ | — | GitHub token for API access |
| `xs-max` | ❌ | `10` | Max lines for XS label |
| `s-max` | ❌ | `50` | Max lines for S label |
| `m-max` | ❌ | `200` | Max lines for M label |
| `l-max` | ❌ | `500` | Max lines for L label |

## License

MIT
