require('dotenv').config();
const XLSX = require('xlsx');
const ZsxqParser = require('./parser');
const ZsxqApi = require('./api');
const { formatDate, decodeText } = require('./utils');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class ZsxqCrawler {
    constructor() {
        this.cookie = process.env.ZSXQ_COOKIE;
        this.groupId = process.env.ZSXQ_GROUP_ID;
        this.api = new ZsxqApi(this.cookie, this.groupId);
        this.initDB();
    }

    async initDB() {
        this.db = await open({
            filename: './zsxq.db',
            driver: sqlite3.Database
        });

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id TEXT,
                title TEXT,
                author TEXT,
                create_time TEXT,
                content TEXT,
                article_title TEXT,
                article_content TEXT,
                article_url TEXT,
                author_location TEXT,
                read_count INTEGER,
                likes INTEGER,
                comments_count INTEGER,
                article_id TEXT
            )
        `);
    }

    async start() {
        try {
            console.log('开始爬取数据...');
            const months = 1; // 获取最近两年的数据
            console.log(`准备获取最近 ${months} 个月的数据`);

            const topics = await this.api.getAllTopics(months);
            console.log(`共获取 ${topics.length} 条数据`);

            console.log('开始解析数据并保存到数据库...');
            await this.parseResponse({ resp_data: { topics } });

            console.log('数据爬取完成！');
        } catch (error) {
            console.error('爬取失败:', error);
        }
    }

    async parseResponse(responseData) {
        const parser = new ZsxqParser(responseData);
        const topics = parser.parseTopics();

        // 直接使用解析后的数据，不再生成excelData
        await this.db.run('DELETE FROM topics');

        // 批量插入数据（调整字段顺序与数据库表结构一致）
        const stmt = await this.db.prepare(`
            INSERT INTO topics (
                topic_id, title, author, create_time, 
                content, article_title, article_content, 
                article_url, author_location, read_count, 
                likes, comments_count, article_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const topic of topics) {
            await stmt.run(
                topic.topicId,
                decodeText(topic.title),
                decodeText(topic.author.name),
                formatDate(topic.createTime),
                decodeText(topic.content.text),
                topic.content.article ? decodeText(topic.content.article.title) : '',
                topic.content.article ?
                    decodeText(topic.content.article.content)
                        .replace(/\n/g, '\\n')  // 保留换行符转义
                    : '',
                topic.content.article ? topic.content.article.htmlFile : '',
                decodeText(topic.author.location),
                topic.readCount,
                topic.likes,
                topic.comments.length,
                topic.content.article?.articleId || ''
            );
        }

        await stmt.finalize();
        console.log('数据已保存到数据库');
        return topics;
    }

    // ... 其他代码
}

// 使用示例
const crawler = new ZsxqCrawler();
crawler.start(); 