const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * pre-publish と public にある記事に基づいてシリーズ記事のリンクを生成する
 * @param {string} prePublishDir - シリーズ記事を含むディレクトリ
 * @param {string} publicDir - 公開済みの記事が格納されたディレクトリ
 */
const generateSeriesLinks = (prePublishDir, publicDir) => {
    // ディレクトリが存在するか確認
    if (!fs.existsSync(prePublishDir) || !fs.existsSync(publicDir)) {
        console.error(`エラー: ディレクトリが見つかりません: ${prePublishDir}, ${publicDir}`);
        process.exit(1);
    }

    // pre-publish 内の記事を読み込み、タイトルとシリーズを抽出
    const prePublishArticles = fs.readdirSync(prePublishDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(prePublishDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                series: parsed.data.series || null, // series プロパティがない場合、null とする
            };
        })
        .filter((article) => article.series); // series がないまたは null の記事を除外

    if (prePublishArticles.length === 0) {
        console.log("シリーズが定義されている記事が pre-publish ディレクトリにありません。終了します。");
        return;
    }

    // public 内の記事を読み込み、タイトルと ID を抽出
    const publicArticles = fs.readdirSync(publicDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(publicDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                id: parsed.data.id,
                metadata: parsed.data,
                content: parsed.content,
            };
        });

    // pre-publish 内の記事を series ごとにグループ化
    const seriesMap = {};
    prePublishArticles.forEach((article) => {
        if (!seriesMap[article.series]) {
            seriesMap[article.series] = [];
        }
        seriesMap[article.series].push(article);
    });

    // 各シリーズについてリンクを生成し、public 内の記事を更新
    Object.keys(seriesMap).forEach((series) => {
        const articlesInSeries = seriesMap[series];

        // ファイル名順にソート（必要に応じてソートロジックを変更可能）
        articlesInSeries.sort((a, b) => a.file.localeCompare(b.file));

        // public 内の記事を更新
        articlesInSeries.forEach((article, index) => {
            const publicArticle = publicArticles.find((pub) => pub.title === article.title);
            if (!publicArticle) {
                console.error(`エラー: 該当する public 記事が見つかりません: ${article.title}`);
                return;
            }

            // 現在の記事を除外し、シリーズリンクを生成
            const filteredArticles = articlesInSeries.filter((a) => a.title !== article.title);

            const seriesLinks = `${series} シリーズ記事：\n\n` + filteredArticles.map((filteredArticle, idx) => {
                const targetArticle = publicArticles.find((pub) => pub.title === filteredArticle.title);
                if (!targetArticle || !targetArticle.id) {
                    console.error(`エラー: 該当する public 記事が見つかりません: ${filteredArticle.title}`);
                    process.exit(1);
                }
                return `[${filteredArticle.title}](https://qiita.com/SolitudeRA/items/${targetArticle.id})`;
            }).join('\n');

            // 現在の記事に既存のシリーズリンクがあるか確認
            const contentLines = publicArticle.content.split('\n');
            const existingSeriesIndex = contentLines.findIndex((line) => line.startsWith(`${series} シリーズ記事：`));

            // 既存のシリーズリンクがあり、変更がない場合はスキップ
            if (existingSeriesIndex !== -1) {
                const existingLinks = contentLines.slice(existingSeriesIndex, existingSeriesIndex + filteredArticles.length + 1).join('\n');
                if (existingLinks === seriesLinks) {
                    console.log(`No changes for: ${publicArticle.file}. Skipping.`);
                    return;
                }

                // 既存のシリーズリンクを置き換え
                contentLines.splice(existingSeriesIndex, filteredArticles.length + 1, ...seriesLinks.split('\n'));
                console.log(`Updated series links for: ${publicArticle.file}`);
            } else {
                // シリーズリンクが未挿入の場合、記事の先頭に追加
                contentLines.unshift(seriesLinks);
                console.log(`Inserted series links for: ${publicArticle.file}`);
            }

            // 記事内容を更新
            const updatedContent = contentLines.join('\n');
            const newFileContent = matter.stringify(updatedContent, publicArticle.metadata);

            const publicFilePath = path.join(publicDir, publicArticle.file);
            fs.writeFileSync(publicFilePath, newFileContent, 'utf8');
        });
    });

    console.log('Series links generated and updated successfully.');
};

// 他のファイルで使用するためのエクスポート
module.exports = generateSeriesLinks;

// コマンドライン引数からディレクトリを取得して実行
if (require.main === module) {
    const prePublishDir = process.argv[2];
    const publicDir = process.argv[3];

    if (!prePublishDir || !publicDir) {
        console.error("エラー: ディレクトリ引数が不足しています。使用方法: node generate-series-links.js <pre-publish-dir> <public-dir>");
        process.exit(1);
    }

    generateSeriesLinks(prePublishDir, publicDir);
}