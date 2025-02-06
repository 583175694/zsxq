document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    fetch(`http://localhost:3000/api/topic/${id}`)
        .then(response => response.json())
        .then(article => {
            if (!article) {
                window.location.href = 'index.html';
                return;
            }

            document.getElementById('title').textContent = article.title;
            document.getElementById('author').textContent = `作者：${article.author}`;
            document.getElementById('date').textContent = `发布时间：${article.create_time}`;

            const contentDiv = document.getElementById('content');
            if (article.article_html_url) {
                // 加载HTML内容
                fetch(article.article_html_url)
                    .then(res => res.text())
                    .then(html => {
                        contentDiv.innerHTML = DOMPurify.sanitize(html);
                    });
            } else {
                // 保留原有的Markdown回退逻辑
                const rawContent = article.article_content
                    .replace(/\\n/g, '\n')
                    .replace(/  \n/g, '\n');
                contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(rawContent));
            }
        })
        .catch(error => {
            console.error('加载数据失败:', error);
        });
}); 