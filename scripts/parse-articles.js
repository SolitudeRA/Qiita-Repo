const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// ソースディレクトリとターゲットディレクトリを定義
const sourceDir = path.join(__dirname, '../pre-publish');
const targetDir = path.join(__dirname, '../public');

// ターゲットディレクトリが存在するか確認
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// `pre-publish` フォルダ内のMarkdownファイルを処理
fs.readdirSync(sourceDir).forEach((file) => {
    const sourceFilePath = path.join(sourceDir, file);

    if (path.extname(file) === '.md') {
        const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
        const { data: sourceData, content: sourceBody } = matter(sourceContent);

        // `title` と `local_updated_at` が存在するか確認
        if (!sourceData.title || !sourceData.local_updated_at) {
            console.error(`エラー: 必須フィールド (title または local_updated_at) が見つかりません: ${file}。スキップします...`);
            return;
        }

        // `public` 内で同じタイトルのファイルを検索
        const targetFile = fs
            .readdirSync(targetDir)
            .find((targetFile) => {
                if (path.extname(targetFile) !== '.md') return false;
                const targetContent = fs.readFileSync(path.join(targetDir, targetFile), 'utf-8');
                const { data: targetData } = matter(targetContent);
                return targetData.title === sourceData.title;
            });

        // 同じタイトルのファイルが見つかった場合
        if (targetFile) {
            const targetFilePath = path.join(targetDir, targetFile);
            const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
            const { data: targetData, content: targetBody } = matter(targetContent);

            const targetUpdatedAt = new Date(targetData.updated_at).getTime();
            const sourceUpdatedAt = new Date(sourceData.local_updated_at).getTime();

            if (sourceUpdatedAt > targetUpdatedAt) {
                console.log(`更新中: ${targetFile} (新しいバージョンが検出されました)`);

                // 内容のみ更新し、ヘッダーは保持
                const updatedContent = matter.stringify(sourceBody, targetData);
                fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
            } else {
                console.log(`Skipping: ${targetFile} (No updates detected)`);
            }
        } else {
            // デフォルトフィールドをマージ (ファイルが存在しない場合のみ)
            const defaultFields = {
                title: 'No Title',
                tags: ['default'],
                private: false,
                updated_at: null,
                local_updated_at: formatWithTimezone(new Date()),
                id: null,
                organization_url_name: null,
                slide: false,
                ignorePublish: false,
            };

            const metadata = { ...defaultFields, ...sourceData };

            // `tags` フィールドが空の場合、デフォルト値を設定
            if (!metadata.tags || metadata.tags.length === 0) {
                metadata.tags = ['default'];
            }

            const targetFilePath = path.join(targetDir, file);
            const updatedContent = matter.stringify(sourceBody, metadata);
            fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
            console.log(`Processed: ${file}`);
        }
    }
});

// 日付を `YYYY-MM-DDTHH:mm:ss+HH:mm` フォーマットで整形
function formatWithTimezone(date) {
    const offset = -date.getTimezoneOffset(); // タイムゾーンのオフセットを分単位で取得
    const sign = offset >= 0 ? "+" : "-"; // タイムゾーンの正負を判定
    const hours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, "0");
    const minutes = Math.abs(offset % 60).toString().padStart(2, "0");

    return (
        date.getFullYear() +
        "-" +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        "-" +
        date.getDate().toString().padStart(2, "0") +
        "T" +
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0") +
        ":" +
        date.getSeconds().toString().padStart(2, "0") +
        sign +
        hours +
        ":" +
        minutes
    );
}