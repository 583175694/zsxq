const axios = require('axios');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const { sleep } = require('./utils');
const fs = require('fs/promises');
const path = require('path');
const pdf = require('html-pdf');

class ZsxqApi {
    constructor(cookie, groupId) {
        this.groupId = groupId;
        this.baseUrl = 'https://api.zsxq.com/v2';
        this.headers = {
            'authority': 'api.zsxq.com',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'origin': 'https://wx.zsxq.com',
            'referer': 'https://wx.zsxq.com/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'cookie': cookie
        };
        this.articleHeaders = {
            'authority': 'articles.zsxq.com',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'cache-control': 'no-cache',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'cookie': cookie
        };
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            strongDelimiter: '**',
            emDelimiter: '*',
            br: '  \n',
            blankReplacement: (content, node) => {
                return node.isBlock ? '\n\n' : '';
            }
        });

        this.turndownService.addRule('zsxqBr', {
            filter: ['br'],
            replacement: () => '  \n'
        });

        this.turndownService.addRule('zsxqParagraph', {
            filter: ['p'],
            replacement: (content) => `${content}\n\n`
        });

        this.turndownService.addRule('zsxqDiv', {
            filter: ['div'],
            replacement: (content) => `\n${content}\n`
        });

        this.turndownService.addRule('zsxqPre', {
            filter: ['pre'],
            replacement: (content) => `\n\`\`\`\n${content}\n\`\`\`\n`
        });

        // 添加文章存储目录
        this.articlesDir = path.join(__dirname, '../articles');
        this.ensureDirExists();
    }

    async ensureDirExists() {
        try {
            await fs.mkdir(this.articlesDir, { recursive: true });
        } catch (err) {
            console.error('创建目录失败:', err);
        }
    }

    /**
     * 获取话题列表
     * @param {string} endTime - 结束时间，格式：2025-01-15T19:15:59.999+0800
     * @returns {Promise<Object>} 话题列表数据
     */
    async getTopics(endTime = '') {
        try {
            const url = `${this.baseUrl}/groups/${this.groupId}/topics`;
            const params = {
                scope: 'all',
                count: 20
            };

            if (endTime) {
                params.end_time = endTime;
            }

            const response = await axios.get(url, {
                headers: this.headers,
                params
            });

            return response.data;
        } catch (error) {
            console.error('获取话题列表失败:', error.message);
            throw error;
        }
    }

    /**
     * 获取文章内容
     * @param {string} url - 文章URL
     * @returns {Promise<string>} Markdown格式的文章内容
     */
    async getArticleContent(url, articleId) {
        try {
            if (!url) return '';

            const response = await axios.get(url, {
                headers: this.articleHeaders
            });

            // 保存PDF文件
            const filename = `${articleId}.pdf`;
            const filePath = path.join(this.articlesDir, filename);

            // 将HTML转换为PDF
            await new Promise((resolve, reject) => {
                pdf.create(response.data).toFile(filePath, (err, res) => {
                    if (err) return reject(err);
                    resolve(res);
                });
            });

            return filename; // 返回PDF文件名
        } catch (error) {
            console.error('获取文章内容失败:', error.message);
            return '';
        }
    }

    /**
     * 获取指定时间范围内的所有话题
     * @param {number} months - 要获取的月份数
     * @returns {Promise<Array>} 所有话题数据
     */
    async getAllTopics(months = 1) {
        console.log('开始获取最近', months, '个月的数据');
        const allTopics = [];
        let endTime = '';
        let hasMore = true;

        // 计算开始时间
        const startTime = new Date();
        let targetYear = startTime.getFullYear();
        let targetMonth = startTime.getMonth() - months;

        // 处理月份为负数的情况
        while (targetMonth < 0) {
            targetYear--;
            targetMonth += 12;
        }

        // 设置目标开始时间
        startTime.setFullYear(targetYear);
        startTime.setMonth(targetMonth);
        startTime.setDate(1); // 设置为月初
        startTime.setHours(0, 0, 0, 0); // 设置为当天开始时间

        console.log('开始时间:', startTime.toISOString());
        let pageCount = 0;

        while (hasMore) {
            try {
                pageCount++;
                console.log(`正在获取第 ${pageCount} 页数据...`);

                // 获取一页数据
                const data = await this.getTopics(endTime);
                const topics = data.resp_data.topics;

                if (!topics || topics.length === 0) {
                    console.log('没有更多数据了');
                    break;
                }

                // 获取当前页的时间范围
                const lastTopicTime = new Date(topics[topics.length - 1].create_time);
                console.log('当前页最后一条数据时间:', lastTopicTime.toISOString());
                console.log('目标开始时间:', startTime.toISOString());

                // 检查是否还有更多数据需要获取
                if (lastTopicTime < startTime) {
                    // 只添加在时间范围内的话题
                    const validTopics = topics.filter(topic => {
                        const topicTime = new Date(topic.create_time);
                        return topicTime >= startTime;
                    });

                    // 获取文章内容
                    for (const topic of validTopics) {
                        if (topic.talk?.article?.article_url) {
                            console.log(`正在获取文章: ${topic.talk.article.title}`);
                            const htmlFile = await this.getArticleContent(
                                topic.talk.article.article_url,
                                topic.talk.article.article_id
                            );
                            topic.talk.article.htmlFile = htmlFile;
                        }
                    }

                    allTopics.push(...validTopics);
                    console.log(`已获取到目标时间，本页有效数据 ${validTopics.length} 条`);
                    hasMore = false;
                } else {
                    // 获取文章内容
                    for (const topic of topics) {
                        if (topic.talk?.article?.article_url) {
                            console.log(`正在获取文章: ${topic.talk.article.title}`);
                            topic.talk.article.htmlFile = await this.getArticleContent(
                                topic.talk.article.article_url,
                                topic.talk.article.article_id
                            );
                        }
                    }

                    allTopics.push(...topics);
                    console.log(`本页获取到 ${topics.length} 条数据`);

                    // 设置下一页的endTime
                    const lastCreateTime = new Date(lastTopicTime);
                    lastCreateTime.setMilliseconds(lastCreateTime.getMilliseconds() - 1);
                    endTime = lastCreateTime.toISOString().replace('Z', '+0800');
                }

                // 添加延时，避免请求过快
                await sleep(2000);

            } catch (error) {
                console.error('获取话题失败:', error);
                console.log('将在5秒后重试...');
                await sleep(5000);
                continue; // 失败后继续尝试
            }
        }

        console.log('数据获取完成，共获取', allTopics.length, '条数据');
        return allTopics;
    }
}

module.exports = ZsxqApi; 