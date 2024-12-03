const fs = require('fs-extra');
const path = require('path');

const syncRemoteToPublic = (remoteDir, publicDir) => {
    // .remote ディレクトリが存在するか確認
    if (!fs.existsSync(remoteDir)) {
        console.error(`エラー: .remote ディレクトリが存在しません: ${remoteDir}`);
        process.exit(1);
    }

    // public ディレクトリが存在することを確認
    fs.ensureDirSync(publicDir);

    // .remote 内のファイルをループ処理
    const remoteFiles = fs.readdirSync(remoteDir);

    remoteFiles.forEach((remoteFile) => {
        const remoteFilePath = path.join(remoteDir, remoteFile);

        // ファイルのみ処理（ディレクトリは無視）
        if (!fs.statSync(remoteFilePath).isFile()) {
            return;
        }

        // 从 .remote 内のファイル内容を読み込む
        const remoteContent = fs.readFileSync(remoteFilePath, 'utf8');

        // public フォルダ内で同じタイトルを含むファイル名を検索
        const publicFile = fs.readdirSync(publicDir).find((publicFileName) => {
            // タイトルはファイル名から取得するものと仮定
            const baseNameWithoutExt = path.basename(publicFileName, path.extname(publicFileName));
            return remoteFile.startsWith(baseNameWithoutExt);
        });

        if (publicFile) {
            const publicFilePath = path.join(publicDir, publicFile);

            // 対応する public ファイルの内容を更新
            fs.writeFileSync(publicFilePath, remoteContent, 'utf8');
            console.log(`更新済み: ${publicFile}`);
        } else {
            console.log(`スキップ: ${remoteFile} に対応する public ファイルが見つかりません。`);
        }
    });

    console.log(`.remote の内容を public に同期しました: ${publicDir}`);
};

// 関数を呼び出す
const remoteDir = path.join(__dirname, '..', 'public', '.remote');
const publicDir = path.join(__dirname, '..', 'public');
syncRemoteToPublic(remoteDir, publicDir);