class ZsxqParser {
    constructor(data) {
        this.data = data;
    }

    /**
     * 解析帖子列表
     * @returns {Array} 解析后的帖子数组
     */
    parseTopics() {
        const topics = this.data.resp_data.topics;
        return topics.map(topic => this.parseTopic(topic));
    }

    /**
     * 解析单个帖子
     * @param {Object} topic 原始帖子数据
     * @returns {Object} 解析后的帖子对象
     */
    parseTopic(topic) {
        return {
            topicId: topic.topic_id || '',
            type: topic.type || 'unknown',
            title: topic.title || '',
            content: this.parseContent(topic.talk || {}),
            createTime: topic.create_time || '',
            likes: topic.likes_count || 0,
            comments: this.parseComments(topic.show_comments || []),
            readCount: topic.reading_count || 0,
            author: this.parseAuthor((topic.talk && topic.talk.owner) || {})
        };
    }

    /**
     * 解析帖子内容
     * @param {Object} talk 帖子内容数据
     * @returns {Object} 解析后的内容对象
     */
    parseContent(talk) {
        return {
            text: talk.text || '',
            article: talk.article ? {
                title: talk.article.title || '',
                articleId: talk.article.article_id || '',
                url: talk.article.article_url || '',
                content: talk.article.content || ''
            } : null
        };
    }

    /**
     * 解析评论
     * @param {Array} comments 评论数据
     * @returns {Array} 解析后的评论数组
     */
    parseComments(comments = []) {
        return comments.map(comment => ({
            commentId: comment.comment_id,
            content: comment.text,
            createTime: comment.create_time,
            author: this.parseAuthor(comment.owner),
            likes: comment.likes_count
        }));
    }

    /**
     * 解析作者信息
     * @param {Object} owner 作者数据
     * @returns {Object} 解析后的作者对象
     */
    parseAuthor(owner) {
        return {
            userId: owner.user_id,
            name: owner.name,
            avatar: owner.avatar_url,
            location: owner.location
        };
    }
}

module.exports = ZsxqParser; 