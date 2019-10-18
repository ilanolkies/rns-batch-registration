# RNS Registration tool

Use this tool to register names in auction registrar.

## Setup

0. `npm i`

1. Create `config.json` as in `sample-config.json`

2. Create `input.json` with an array of all labels to register. For example, to register 'wallet.rsk' and 'apple.rsk'

```json
[
  "wallet",
  "apple"
]
```

3. Create `.secret` with mnemonic phrase.

```
mountains supernatural bird...
```