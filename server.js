const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const app = express();
const port = 3000;

// 允许跨域
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// 添加静态文件中间件
app.use('/articles', express.static(path.join(__dirname, 'articles')));

async function initDB() {
    return open({
        filename: './zsxq.db',
        driver: sqlite3.Database
    });
}

// 获取话题列表
app.get('/api/topics', async (req, res) => {
    const db = await initDB();
    const topics = await db.all(`
        SELECT *, 
        CASE WHEN article_html IS NOT NULL 
            THEN '/articles/' || article_html 
            ELSE NULL 
        END as article_html_url 
        FROM topics
    `);
    res.json(topics);
});

// 获取单个话题详情
app.get('/api/topic/:id', async (req, res) => {
    const db = await initDB();
    const topic = await db.get(`
        SELECT *, 
        CASE WHEN article_html IS NOT NULL 
            THEN '/articles/' || article_html 
            ELSE NULL 
        END as article_html_url 
        FROM topics WHERE id = ?
    `, [req.params.id]);
    res.json(topic);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 