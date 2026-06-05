# ECDICT 数据（体积较大，请自行下载）

从 **仓库根目录** 下载 `ecdict.csv`（不是 Releases 页）：

- 仓库主页：https://github.com/skywind3000/ECDICT
- 直接下载：https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv

或一键下载：

```bash
npm run dict:download-ecdict
```

放到本目录并命名为 `ecdict.csv`，然后运行：

```bash
npm run dict:enrich -- data/dictionary/word-list.example.csv
```

`ecdict.csv` 不会被提交到 Git。
