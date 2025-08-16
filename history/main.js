function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    const savedConversations = JSON.parse(localStorage.getItem('saved-api-chats')) || [];

    if (savedConversations.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <h2>История пуста</h2>
                <p>У вас пока нет сохраненных диалогов</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = savedConversations.map((conversation, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-item-header">
                <div class="history-item-date">${formatDate(conversation.timestamp || Date.now())}</div>
                <div class="history-item-actions">
                    <button class="btn btn-primary" onclick="viewConversation(${index})">Просмотреть</button>
                    <button class="btn btn-danger" onclick="deleteConversation(${index})">Удалить</button>
                </div>
            </div>
            <div class="history-item-content">
                <p><strong>Вопрос:</strong> ${conversation.userMessage}</p>
                <p><strong>Ответ:</strong> ${conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа'}</p>
            </div>
        </div>
    `).join('');
}

function deleteConversation(index) {
    if (confirm('Вы уверены, что хотите удалить этот диалог?')) {
        const savedConversations = JSON.parse(localStorage.getItem('saved-api-chats')) || [];
        savedConversations.splice(index, 1);
        localStorage.setItem('saved-api-chats', JSON.stringify(savedConversations));
        loadHistory();
    }
}

function viewConversation(index) {
    window.location.href = `../index.html?conversation=${index}`;
}

// Загружаем историю при загрузке страницы
document.addEventListener('DOMContentLoaded', loadHistory);