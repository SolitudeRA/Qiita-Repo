const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');

/**
 * 根据 pre-publish 和 public 中的文章生成系列文章的目录
 * @param {string} prePublishDir - 包含需要生成系列的文章的目录
 * @param {string} publicDir - 已发布文章的目录
 */
const generateSeriesLinks = (prePublishDir, publicDir) => {
    // 检查目录是否存在
    if (!fs.existsSync(prePublishDir) || !fs.existsSync(publicDir)) {
        console.error(`Error: One or both directories not found: ${prePublishDir}, ${publicDir}`);
        process.exit(1);
    }

    // 读取 pre-publish 中的文章，提取 title 和 series
    const prePublishArticles = fs.readdirSync(prePublishDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const filePath = path.join(prePublishDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);
            return {
                file,
                title: parsed.data.title,
                series: parsed.data.series || null, // 如果没有 series 属性，设为 null
            };
        })
        .filter((article) => article.series); // 过滤掉没有 series 或值为 null 的文章

    if (prePublishArticles.length === 0) {
        console.log("No articles with 'series' found in pre-publish directory. Exiting.");
        return;
    }

    // 读取 public 中的文章，提取 title 和 id
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

    // 按 series 分组 pre-publish 文章
    const seriesMap = {};
    prePublishArticles.forEach((article) => {
        if (!seriesMap[article.series]) {
            seriesMap[article.series] = [];
        }
        seriesMap[article.series].push(article);
    });

    // 为每个 series 生成目录并更新 public 中的文章
    Object.keys(seriesMap).forEach((series) => {
        const articlesInSeries = seriesMap[series];

        // 按文件名排序（可以根据需求调整排序逻辑）
        articlesInSeries.sort((a, b) => a.file.localeCompare(b.file));

        // 查找对应的 public 文件，获取 id 并生成链接
        const seriesLinks = `シリーズ記事：\n` + articlesInSeries.map((article, index) => {
            const publicArticle = publicArticles.find((pub) => pub.title === article.title);
            if (!publicArticle || !publicArticle.id) {
                console.error(`Error: Could not find corresponding public article for title: ${article.title}`);
                process.exit(1);
            }
            return `[${series} #${index + 1} ${article.title}](https://qiita.com/SolitudeRA/items/${publicArticle.id})`;
        }).join('\n');

        // 更新 public 中的文章
        articlesInSeries.forEach((article) => {
            const publicArticle = publicArticles.find((pub) => pub.title === article.title);
            if (!publicArticle) {
                console.error(`Error: Could not find corresponding public article for title: ${article.title}`);
                return;
            }

            // 检查当前文章是否已有系列目录
            const contentLines = publicArticle.content.split('\n');
            const existingSeriesIndex = contentLines.findIndex((line) => line.startsWith('シリーズ記事：'));

            // 如果已存在目录且未改变，则跳过更新
            if (existingSeriesIndex !== -1) {
                const existingLinks = contentLines.slice(existingSeriesIndex, existingSeriesIndex + articlesInSeries.length + 1).join('\n');
                if (existingLinks === seriesLinks) {
                    console.log(`No changes for: ${publicArticle.file}. Skipping.`);
                    return;
                }

                // 替换已有目录
                contentLines.splice(existingSeriesIndex, articlesInSeries.length + 1, ...seriesLinks.split('\n'));
                console.log(`Updated series links for: ${publicArticle.file}`);
            } else {
                // 未插入系列目录，直接在开头添加
                contentLines.unshift(seriesLinks);
                console.log(`Inserted series links for: ${publicArticle.file}`);
            }

            // 更新文章内容
            const updatedContent = contentLines.join('\n');
            const newFileContent = matter.stringify(updatedContent, publicArticle.metadata);

            const publicFilePath = path.join(publicDir, publicArticle.file);
            fs.writeFileSync(publicFilePath, newFileContent, 'utf8');
        });
    });

    console.log('Series links generated and updated successfully.');
};

// 导出函数以便在其他文件中使用
module.exports = generateSeriesLinks;

// 如果直接运行文件，则从命令行参数中获取目录并执行
if (require.main === module) {
    const prePublishDir = process.argv[2];
    const publicDir = process.argv[3];

    if (!prePublishDir || !publicDir) {
        console.error("Error: Missing directory arguments. Usage: node generate-series-links.js <pre-publish-dir> <public-dir>");
        process.exit(1);
    }

    generateSeriesLinks(prePublishDir, publicDir);
}