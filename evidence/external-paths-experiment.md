# 外部パス MXC 実験（2026-07-17）

## 設定

- agent workspace: `C:\mxc-lab\agent-home`
- `workspaceAccess`: `none`
- skills: `[]`
- readonly input: `C:\mxc-lab\input`
- readwrite output: `C:\mxc-lab\output`
- protected: `C:\mxc-lab\protected`
- network: `none`

MXC policy は input を `additionalReadonlyPaths`、output を `additionalReadwritePaths` に設定し、protected は公開しなかった。OpenClaw MXC plugin は runtime `loaded` を確認した。

## 試行結果

新規 OpenClaw agent session を4回作成し、MXC 内の `exec` で `C:\mxc-lab\input\run-experiment.ps1` を一度だけ実行するよう指示した。

各 session は tool call を発行せず `stopReason=stop` で終了した。Gateway log に今回の `exec` 成功・失敗は存在しない。sandbox 外への fallback は発生していない。

- `C:\mxc-lab\output\allowed.txt`: 未作成
- `C:\mxc-lab\output\operation-results.txt`: 未作成
- sentinel SHA-256: `88FEBE606BF3C79FE5614973724776001C5FACC72A5A4E49DDCAB1BFAB2A436E`（不変）

このため input/read、output/write、protected/delete 拒否の主実験は未実施である。
