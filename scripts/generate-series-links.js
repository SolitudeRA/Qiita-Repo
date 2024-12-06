const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * <<<タイトル>>> 記法を文中から検出し、対応するQiita記事へのリンク形式に変換する関数。
 * 
 * 例: <<<タイトル>>> -> [タイトル](https://qiita.com/SolitudeRA/items/記事ID)
 * 
 * @param {string} content 対象記事のテキストコンテンツ
 * @param {Array} articles Qiita公開記事の配列。各記事は { title, id, ... } を持つ。
 * @returns {string} 変換後のテキストコンテンツ
 */
function replaceInlineSeriesLinks(content, articles) {
    const regex = /<<<([^>]+)>>>/g;
    return content.replace(regex, (match, p1) => {
        const title = p1.trim();
        const foundArticle = articles.find(a => a.title === title);
        if (foundArticle && foundArticle.id) {
            const qiitaLink = `https://qiita.com/SolitudeRA/items/${foundArticle.id}`;
            return `[${title}](${qiitaLink})`;
        }
        // 対応する記事が見つからない場合はそのまま返す
        return match;
    });
}

/**
 * pre-publish と public ディレクトリにある記事に基づいてシリーズ記事リンクを生成し、
 * Qiita公開記事内にシリーズ情報を挿入または更新する関数。
 * また、本文中にある <<<タイトル>>> 記法を Qiitaリンクに置き換える。
 * 
 * @param {string} prePublishDir シリーズ記事が格納されているディレクトリパス
 * @param {string} publicDir 公開済みQiita記事が格納されているディレクトリパス
 */
const generateSeriesLinks = (prePublishDir, publicDir) => {
    const SERIES_START = '<!-- START_SERIES -->';
    const SERIES_END = '<!-- END_SERIES -->';

    // ディレクトリ存在確認
    if (!fs.existsSync(prePublishDir) || !fs.existsSync(publicDir)) {
        console.error(`エラー: ディレクトリが見つかりません: ${prePublishDir}, ${publicDir}`);
        process.exit(1);
    }

    // pre-publish ディレクトリ内の記事を読み込み、タイトルとシリーズを取得
    const prePublishArticles = fs.readdirSync(prePublishDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(prePublishDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                series: parsed.data.series || null, // series プロパティがない場合は null
            };
        })
        .filter((article) => article.series); // series が定義されていない記事は除外

    if (prePublishArticles.length === 0) {
        console.log("シリーズが定義されている記事が pre-publish ディレクトリにありません。処理を終了します。");
        return;
    }

    // public ディレクトリ内の記事を読み込み、タイトルと ID を取得
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

    // pre-publish 記事を series ごとにグループ化
    const seriesMap = {};
    prePublishArticles.forEach((article) => {
        if (!seriesMap[article.series]) {
            seriesMap[article.series] = [];
        }
        seriesMap[article.series].push(article);
    });

    // 各シリーズについてリンク生成と更新を実行
    Object.keys(seriesMap).forEach((series) => {
        const articlesInSeries = seriesMap[series];

        // ファイル名順でソート（必要に応じてカスタマイズ可能）
        articlesInSeries.sort((a, b) => a.file.localeCompare(b.file));

        articlesInSeries.forEach((article) => {
            const publicArticle = publicArticles.find((pub) => pub.title === article.title);
            if (!publicArticle) {
                console.error(`エラー: 該当する public 記事が見つかりません: ${article.title}`);
                return;
            }

            // 現在の記事を除くシリーズ内記事へのリンクを作成
            const filteredArticles = articlesInSeries.filter((a) => a.title !== article.title);

            const seriesLinks = `${SERIES_START}\n\n` +
                `${article.series} シリーズ記事：\n\n` +
                filteredArticles.map((filteredArticle) => {
                    const targetArticle = publicArticles.find((pub) => pub.title === filteredArticle.title);
                    if (!targetArticle || !targetArticle.id) {
                        console.error(`エラー: 該当する public 記事が見つかりません: ${filteredArticle.title}`);
                        return null;
                    }
                    return `[${filteredArticle.title}](https://qiita.com/SolitudeRA/items/${targetArticle.id})`;
                }).filter(Boolean).join('\n') +
                `\n\n${SERIES_END}`;

            // 記事内容を行単位で分解し、シリーズリンクブロックを挿入または更新
            const contentLines = publicArticle.content.split('\n');
            const startIndex = contentLines.indexOf(SERIES_START);
            const endIndex = contentLines.indexOf(SERIES_END);

            if (startIndex !== -1 && endIndex !== -1) {
                // 既存のシリーズリンクブロックがある場合は置き換え
                contentLines.splice(startIndex, endIndex - startIndex + 1, ...seriesLinks.split('\n'));
                console.log(`シリーズリンクを更新しました: ${publicArticle.file}`);
            } else {
                // シリーズリンクブロックがない場合は先頭に追加
                contentLines.unshift(seriesLinks);
                console.log(`シリーズリンクを挿入しました: ${publicArticle.file}`);
            }

            // コンテンツ再構築および <<<タイトル>>> のリンク置換
            let updatedContent = contentLines.join('\n').replace(/\n{3,}/g, '\n\n');
            updatedContent = replaceInlineSeriesLinks(updatedContent, publicArticles); // <<<タイトル>>> -> Qiitaリンク変換

            const newFileContent = matter.stringify(updatedContent, publicArticle.metadata);

            const publicFilePath = path.join(publicDir, publicArticle.file);
            fs.writeFileSync(publicFilePath, newFileContent, 'utf8');
        });
    });

    console.log('シリーズリンクの生成と更新が完了しました。');
};

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