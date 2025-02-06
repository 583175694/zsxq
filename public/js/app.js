document.addEventListener('DOMContentLoaded', function () {
    fetch('http://localhost:3000/api/topics')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('data-table');
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.title}</td>
                    <td>${row.author}</td>
                    <td>${row.create_time}</td>
                    <td>${row.read_count}</td>
                    <td>${row.likes}</td>
                    <td>${row.comments_count}</td>
                `;
                tr.addEventListener('click', () => {
                    if (row.article_id) {
                        window.open(`/articles/${row.article_id}.pdf`, '_blank');
                    }
                });
                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error('加载数据失败:', error));
}); 