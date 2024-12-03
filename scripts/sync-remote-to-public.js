const fs = require('fs-extra');
const path = require('path');

const syncRemoteToPublic = (remoteDir, publicDir) => {
    // 检查 .remote 文件夹是否存在
    if (!fs.existsSync(remoteDir)) {
        console.error(`エラー: .remote ディレクトリが存在しません: ${remoteDir}`);
        process.exit(1);
    }

    // 确保 public 文件夹存在
    fs.ensureDirSync(publicDir);

    // 遍历 .remote 中的文件
    const remoteFiles = fs.readdirSync(remoteDir);

    remoteFiles.forEach((remoteFile) => {
        const remoteFilePath = path.join(remoteDir, remoteFile);

        // 仅处理文件（忽略文件夹）
        if (!fs.statSync(remoteFilePath).isFile()) {
            return;
        }

        // 从 .remote 文件中读取内容
        const remoteContent = fs.readFileSync(remoteFilePath, 'utf8');

        // 在 public 文件夹中寻找文件名包含相同标题的文件
        const publicFile = fs.readdirSync(publicDir).find((publicFileName) => {
            // 假设标题可以从文件名中找到
            const baseNameWithoutExt = path.basename(publicFileName, path.extname(publicFileName));
            return remoteFile.startsWith(baseNameWithoutExt);
        });

        if (publicFile) {
            const publicFilePath = path.join(publicDir, publicFile);

            // 更新 public 中对应文件的内容
            fs.writeFileSync(publicFilePath, remoteContent, 'utf8');
            console.log(`更新済み: ${publicFile}`);
        } else {
            console.log(`スキップ: ${remoteFile} に対応する public ファイルが見つかりません。`);
        }
    });

    console.log(`.remote の内容を public に同期しました: ${publicDir}`);
};

// 调用函数
const remoteDir = path.join(__dirname, '..', 'public', '.remote');
const publicDir = path.join(__dirname, '..', 'public');
syncRemoteToPublic(remoteDir, publicDir);