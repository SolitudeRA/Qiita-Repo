const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 定义源目录和目标目录
const sourceDir = path.join(__dirname, '../pre-publish');
const targetDir = path.join(__dirname, '../public');

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 遍历 `pre-publish` 文件夹中的 Markdown 文件
fs.readdirSync(sourceDir).forEach((file) => {
    const sourceFilePath = path.join(sourceDir, file);

    if (path.extname(file) === '.md') {
        const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');
        const { data: sourceData, content: sourceBody } = matter(sourceContent);

        // 检查是否存在 `title` 和 `updated_at`
        if (!sourceData.title || !sourceData.local_updated_at) {
            console.error(`Error: Missing required fields (title or local_updated_at) in ${file}. Skipping...`);
            return;
        }

        const targetFilePath = path.join(targetDir, file);

        if (fs.existsSync(targetFilePath)) {
            const targetContent = fs.readFileSync(targetFilePath, 'utf-8');
            const { data: targetData } = matter(targetContent);

            // 如果 `title` 和 `local_updated_at` 相同，跳过处理
            if (targetData.title === sourceData.title && targetData.local_updated_at === sourceData.local_updated_at) {
                console.log(`Skipping: ${file} (No updates detected)`);
                return;
            }
        }

        // 合并默认字段
        const defaultFields = {
            title: 'No Title',
            tags: [],
            private: false,
            updated_at: null,
            local_updated_at: formatWithTimezone(new Date()),
            id: null,
            organization_url_name: null,
            slide: false,
            ignorePublish: false,
        };

        const metadata = { ...defaultFields, ...sourceData };

        // 如果 `tags` 字段为空，设置默认值
        if (!metadata.tags || metadata.tags.length === 0) {
            metadata.tags = ['default'];
        }

        // 写入 `public` 文件夹
        const updatedContent = matter.stringify(sourceBody, metadata);
        fs.writeFileSync(targetFilePath, updatedContent, 'utf-8');
        console.log(`Processed: ${file}`);
    }
});

function formatWithTimezone(date) {
    const offset = -date.getTimezoneOffset(); // 获取时区偏移，单位是分钟
    const sign = offset >= 0 ? "+" : "-"; // 判断时区偏移正负号
    const hours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, "0"); // 时区小时部分
    const minutes = Math.abs(offset % 60).toString().padStart(2, "0"); // 时区分钟部分
  
    // 格式化日期为 YYYY-MM-DDTHH:mm:ss+HH:mm
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