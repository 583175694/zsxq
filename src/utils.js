const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

/**
 * 解码HTML实体和Unicode编码
 * @param {string} text 需要解码的文本
 * @returns {string} 解码后的文本
 */
const decodeText = (text) => {
    if (!text) return '';

    // 解码HTML实体
    text = text.replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#39;/g, "'");

    // 解码Unicode
    text = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );

    // 移除HTML标签
    text = text.replace(/<[^>]*>/g, '');

    // 处理特殊的知识星球标签
    text = text.replace(/<e[^>]*>/g, '');

    // 处理多余的空白字符
    text = text.replace(/\s+/g, ' ').trim();

    return text;
};

module.exports = {
    sleep,
    formatDate,
    decodeText
}; 