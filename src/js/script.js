const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");
const themeToggleButton = document.getElementById("themeToggler");
const deleteButton = document.getElementById("deleteButton");
const modelSelector = document.getElementById("modelSelector");
const modelModal = document.getElementById("modelModal");
const modelModalClose = document.querySelector(".model-modal__close");
const modelSearchInput = document.querySelector(".model-modal__search-input");
const modelItems = document.querySelectorAll(".model-item");

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;
let currentModel = localStorage.getItem("selectedModel") || "gemini-pro"; // Загружаем сохраненную модель

const GOOGLE_API_KEY = "AIzaSyAF_RsfXteDkRyLgbV6HMD7-dyRYlndYnY";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

// Load saved data from local storage
const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
    const urlParams = new URLSearchParams(window.location.search);
    const conversationIndex = urlParams.get('conversation');

    document.body.classList.toggle("light_mode", isLightTheme);
    themeToggleButton.innerHTML = isLightTheme ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';

    chatHistoryContainer.innerHTML = '';

    // Если указан индекс диалога, показываем только его
    if (conversationIndex !== null) {
        const conversation = savedConversations[conversationIndex];
        if (conversation) {
            displayConversation(conversation);
            return;
        }
    }

    // Иначе показываем все диалоги
    savedConversations.forEach(conversation => {
        displayConversation(conversation);
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);
};

// Функция для отображения одного диалога
const displayConversation = (conversation) => {
    // Display the user's message
    const userMessageHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/profile.png" alt="User avatar">
            <p class="message__text">${conversation.userMessage}</p>
        </div>
    `;

    const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
    chatHistoryContainer.appendChild(outgoingMessageElement);

    // Display the API response
    const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedApiResponse = marked.parse(responseText); // Convert to HTML
    const rawApiResponse = responseText; // Plain text version

    const responseHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/ai.png" alt="Ai avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator hide">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide">
            <span class="copy-text">Copy</span>
            <i class='bx bx-copy-alt'></i>
        </span>
        <span onClick="handleNewChat()" class="message__icon message__icon-margin hide">
            <span class="copy-text">New chat</span>
            <i class='bx bx-plus'></i>
        </span>
        <span onClick="handleLike(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-like'></i>
        </span>
        <span onClick="handleDislike(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-dislike'></i>
        </span>
        <span onClick="handleHeart(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-heart'></i>
        </span>
    `;

    const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
    chatHistoryContainer.appendChild(incomingMessageElement);

    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    // Display saved chat without typing effect
    showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement, true); // 'true' skips typing
};

// create a new chat message element
const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    messageElement.dataset.messageId = Date.now().toString(); // Добавляем уникальный ID
    return messageElement;
}

// Show typing effect
const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    const newChatIconElement = incomingMessageElement.querySelector(".message__icon-margin");
    const likeIconElement = incomingMessageElement.querySelector(".message__icon:nth-child(4)");
    const dislikeIconElement = incomingMessageElement.querySelector(".message__icon:nth-child(5)");
    const heartIconElement = incomingMessageElement.querySelector(".message__icon:nth-child(6)");
    
    copyIconElement.classList.add("hide");
    newChatIconElement.classList.add("hide");
    likeIconElement.classList.add("hide");
    dislikeIconElement.classList.add("hide");
    heartIconElement.classList.add("hide");

    // Проверяем сохраненное состояние реакций
    const messageId = incomingMessageElement.dataset.messageId;
    if (messageId) {
        const savedReaction = localStorage.getItem(`message_${messageId}_reaction`);
        if (savedReaction === 'like') {
            likeIconElement.classList.add('active');
        } else if (savedReaction === 'dislike') {
            dislikeIconElement.classList.add('active');
        } else if (savedReaction === 'heart') {
            heartIconElement.classList.add('active');
        }
    }

    if (skipEffect) {
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIconElement.classList.remove("hide");
        newChatIconElement.classList.remove("hide");
        likeIconElement.classList.remove("hide");
        dislikeIconElement.classList.remove("hide");
        heartIconElement.classList.remove("hide");
        isGeneratingResponse = false;
        return;
    }

    const wordsArray = rawText.split(' ');
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        messageElement.innerText += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if (wordIndex === wordsArray.length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            copyIconElement.classList.remove("hide");
            newChatIconElement.classList.remove("hide");
            likeIconElement.classList.remove("hide");
            dislikeIconElement.classList.remove("hide");
            heartIconElement.classList.remove("hide");
        }
    }, 75);
};

// Fetch API response based on user input
const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: currentUserMessage }] }]
            }),
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message);

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API response.");

        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement);

        // Save conversation in local storage
        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({
            userMessage: currentUserMessage,
            apiResponse: responseData,
            timestamp: Date.now() // Добавляем время создания
        });
        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));
    } catch (error) {
        isGeneratingResponse = false;
        messageTextElement.innerText = error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
    }
};

// Add copy button to code blocks
const addCopyButtonToCodeBlocks = () => {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'Text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Unable to copy text!");
            });
        });
    });
};

// Show loading animation during API request
const displayLoadingAnimation = () => {
    const loadingHtml = `

        <div class="message__content">
            <img class="message__avatar" src="assets/gemini.svg" alt="Gemini avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator hide">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide">
            <span class="copy-text">Copy</span>
            <i class='bx bx-copy-alt'></i>
        </span>
        <span onClick="handleNewChat()" class="message__icon message__icon-margin hide">
            <span class="copy-text">New chat</span>
            <i class='bx bx-plus'></i>
        </span>
        <span onClick="handleLike(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-like'></i>
        </span>
        <span onClick="handleDislike(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-dislike'></i>
        </span>
        <span onClick="handleHeart(this)" class="message__icon message__icon-margin hide">
            <i class='bx bx-heart'></i>
        </span>
    
    `;

    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    requestApiResponse(loadingMessageElement);
};

// Copy message to clipboard
const copyMessageToClipboard = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;
    const copyText = copyButton.querySelector(".copy-text");

    navigator.clipboard.writeText(messageContent);
    copyButton.querySelector("i").className = 'bx bx-check';
    copyText.textContent = 'Copy';
    
    setTimeout(() => {
        copyButton.querySelector("i").className = 'bx bx-copy-alt';
        copyText.textContent = 'Copy';
    }, 1000);
};

// Handle new chat button click
const handleNewChat = () => {
    if (confirm("Вы уверены, что хотите начать New chat?")) {
        localStorage.removeItem("saved-api-chats");
        chatHistoryContainer.innerHTML = '';
        currentUserMessage = null;
        isGeneratingResponse = false;
        document.body.classList.remove("hide-header");
    }
};

// Add event listener for new chat button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('new-chat-btn')) {
        handleNewChat();
    }
});

// Handle sending chat messages
const handleOutgoingMessage = () => {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return; // Exit if no message or already generating response

    isGeneratingResponse = true;

    const outgoingMessageHtml = `
    
        <div class="message__content">
            <img class="message__avatar" src="assets/profile.png" alt="User avatar">
            <p class="message__text"></p>
        </div>

    `;

    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").innerText = currentUserMessage;
    chatHistoryContainer.appendChild(outgoingMessageElement);

    messageForm.reset(); // Clear input field
    document.body.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 500); // Show loading animation after delay
};

// Toggle between light and dark themes
themeToggleButton.addEventListener('click', () => {
    const isLightTheme = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");

    // Update icon based on theme
    const newIconClass = isLightTheme ? "bx bx-moon" : "bx bx-sun";
    themeToggleButton.querySelector("i").className = newIconClass;
});

// Clear all chat history
deleteButton.addEventListener('click', () => {
    if (confirm("Вы уверены, что хотите удалить всю историю чата?")) {
        localStorage.removeItem("saved-api-chats");
        loadSavedChatHistory();
        currentUserMessage = null;
        isGeneratingResponse = false;
    }
});

// Handle click on suggestion items
suggestionItems.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText;
        handleOutgoingMessage();
    });
});

// Prevent default from submission and handle outgoing message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleOutgoingMessage();
});

// Load saved chat history on page load
loadSavedChatHistory();

// Обработка выпадающего меню профиля
const profileButton = document.getElementById('profileButton');
const dropdownMenu = document.querySelector('.dropdown-menu');

profileButton.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
});

// Закрытие меню при клике вне его
document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !profileButton.contains(e.target)) {
        dropdownMenu.classList.remove('show');
    }
});

// Функционал редактирования имени пользователя
document.addEventListener('DOMContentLoaded', function() {
    const usernameElement = document.querySelector('.header__title h2');
    const editIcon = document.querySelector('.icon-edit-profile');
    let isEditing = false;

    // Загружаем сохраненное имя при загрузке страницы
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        usernameElement.textContent = savedUsername;
    }

    editIcon.addEventListener('click', function() {
        if (!isEditing) {
            // Создаем поле ввода
            const input = document.createElement('input');
            input.type = 'text';
            input.value = usernameElement.textContent;
            input.className = 'username-input';
            
            // Заменяем текст на поле ввода
            usernameElement.textContent = '';
            usernameElement.appendChild(input);
            input.focus();
            
            isEditing = true;

            // Обработка сохранения при нажатии Enter или потере фокуса
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    saveUsername();
                }
            });

            input.addEventListener('blur', saveUsername);

            function saveUsername() {
                const newUsername = input.value.trim() || 'Guest';
                usernameElement.textContent = newUsername;
                localStorage.setItem('username', newUsername);
                isEditing = false;
            }
        }
    });
});

// Функция для создания частиц
const createParticles = (button, type) => {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Добавляем класс тряски к кнопке
    button.classList.add('shake');
    setTimeout(() => button.classList.remove('shake'), 500);

    // Массивы иконок для каждого типа реакции
    const likeIcons = ['bx-star', 'bx-bulb', 'bx-smile', 'bx-happy', 'bx-cool', 'bx-wink-smile'];
    const dislikeIcons = ['bx-sad', 'bx-angry', 'bx-confused', 'bx-tired', 'bx-dizzy', 'bx-meh'];
    const heartIcons = ['bx-gift', 'bx-cake', 'bx-crown', 'bx-diamond', 'bx-badge', 'bx-medal'];

    // Выбираем массив иконок в зависимости от типа
    let icons;
    switch(type) {
        case 'like':
            icons = likeIcons;
            break;
        case 'dislike':
            icons = dislikeIcons;
            break;
        case 'heart':
            icons = heartIcons;
            break;
    }

    // Создаем 12 частиц
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}`;
        
        // Случайный угол и расстояние для каждой частицы
        const angle = (i * 30) + Math.random() * 30;
        const distance = 50 + Math.random() * 50;
        const tx = Math.cos(angle * Math.PI / 180) * distance;
        const ty = Math.sin(angle * Math.PI / 180) * distance;
        const tr = Math.random() * 360;
        
        // Устанавливаем CSS переменные для анимации
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--tr', `${tr}deg`);
        
        // Выбираем случайную иконку из соответствующего массива
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        particle.innerHTML = `<i class='bx ${randomIcon}'></i>`;
        
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        
        document.body.appendChild(particle);
        
        // Запускаем анимацию
        particle.style.animation = 'particle 0.8s ease-out forwards';
        
        // Удаляем частицу после завершения анимации
        setTimeout(() => {
            particle.remove();
        }, 800);
    }
};

// Обновляем функции обработки реакций
const handleLike = (button) => {
    const messageElement = button.closest('.message');
    if (!messageElement) return;

    const likeButton = messageElement.querySelector('.message__icon:nth-child(4)');
    const dislikeButton = messageElement.querySelector('.message__icon:nth-child(5)');
    const heartButton = messageElement.querySelector('.message__icon:nth-child(6)');
    
    if (!likeButton || !dislikeButton || !heartButton) return;
    
    likeButton.classList.add('active');
    dislikeButton.classList.remove('active');
    heartButton.classList.remove('active');
    
    // Создаем эффект распыления
    createParticles(likeButton, 'like');
    
    // Сохраняем состояние в localStorage
    const messageId = messageElement.dataset.messageId;
    if (messageId) {
        localStorage.setItem(`message_${messageId}_reaction`, 'like');
    }
};

const handleDislike = (button) => {
    const messageElement = button.closest('.message');
    if (!messageElement) return;

    const likeButton = messageElement.querySelector('.message__icon:nth-child(4)');
    const dislikeButton = messageElement.querySelector('.message__icon:nth-child(5)');
    const heartButton = messageElement.querySelector('.message__icon:nth-child(6)');
    
    if (!likeButton || !dislikeButton || !heartButton) return;
    
    dislikeButton.classList.add('active');
    likeButton.classList.remove('active');
    heartButton.classList.remove('active');
    
    // Создаем эффект распыления
    createParticles(dislikeButton, 'dislike');
    
    // Сохраняем состояние в localStorage
    const messageId = messageElement.dataset.messageId;
    if (messageId) {
        localStorage.setItem(`message_${messageId}_reaction`, 'dislike');
    }
};

const handleHeart = (button) => {
    const messageElement = button.closest('.message');
    if (!messageElement) return;

    const likeButton = messageElement.querySelector('.message__icon:nth-child(4)');
    const dislikeButton = messageElement.querySelector('.message__icon:nth-child(5)');
    const heartButton = messageElement.querySelector('.message__icon:nth-child(6)');
    
    if (!likeButton || !dislikeButton || !heartButton) return;
    
    heartButton.classList.add('active');
    likeButton.classList.remove('active');
    dislikeButton.classList.remove('active');
    
    // Создаем эффект распыления
    createParticles(heartButton, 'heart');
    
    // Сохраняем состояние в localStorage
    const messageId = messageElement.dataset.messageId;
    if (messageId) {
        localStorage.setItem(`message_${messageId}_reaction`, 'heart');
    }
};

// Обработка добавления новых команд
document.addEventListener('DOMContentLoaded', function() {
    const newCommandInput = document.querySelector('.suggests__item-new');
    const commandInput = document.querySelector('.command-input');
    const confirmButton = document.querySelector('.confirm-command');
    const suggestsContainer = document.querySelector('.suggests');

    // Обработка подтверждения новой команды
    confirmButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const commandText = commandInput.value.trim();
        if (commandText) {
            // Создаем новый элемент команды
            const newCommand = document.createElement('div');
            newCommand.className = 'suggests__item';
            newCommand.innerHTML = `
                <p class="suggests__item-text">
                    ${commandText}
                </p>
            `;

            // Добавляем обработчик клика для новой команды
            newCommand.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                document.querySelector('.prompt__form-input').value = commandText;
                handleOutgoingMessage();
            });

            // Вставляем новую команду перед инпутом
            suggestsContainer.insertBefore(newCommand, newCommandInput);
            
            // Очищаем и скрываем инпут
            commandInput.value = '';
            newCommandInput.style.display = 'none';
        }
        return false; // Предотвращаем всплытие события
    });

    // Обработка нажатия Enter в инпуте
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            confirmButton.click();
            return false;
        }
    });
});

// Функции для работы с модальным окном выбора модели
const openModelModal = () => {
    modelModal.classList.add("show");
    document.body.style.overflow = "hidden";
    // Добавляем класс для поворота иконки
    modelSelector.querySelector('i').classList.add('rotate');
};

const closeModelModal = () => {
    modelModal.classList.remove("show");
    document.body.style.overflow = "";
    // Убираем класс для возврата иконки в исходное положение
    modelSelector.querySelector('i').classList.remove('rotate');
};

// Функция для обновления отображения выбранной модели
function updateSelectedModel(modelId) {
    // Добавляем анимацию загрузки
    const modelButton = modelSelector.querySelector('span');
    const originalText = modelButton.textContent;
    modelButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';

    // Имитируем задержку загрузки
    setTimeout(() => {
        // Обновляем текст в кнопке
        const modelName = document.querySelector(`[data-model="${modelId}"] h4`).textContent;
        modelButton.textContent = modelName;
        
        // Обновляем статус "using" для всех моделей
        modelItems.forEach(item => {
            const status = item.querySelector('.model-item__status');
            if (item.dataset.model === modelId) {
                if (!status) {
                    const statusDiv = document.createElement('div');
                    statusDiv.className = 'model-item__status';
                    statusDiv.innerHTML = '<span class="model-item__badge">using</span>';
                    item.appendChild(statusDiv);
                }
            } else {
                if (status) {
                    status.remove();
                }
            }
        });

        // Сохраняем выбранную модель в localStorage
        localStorage.setItem("selectedModel", modelId);
    }, 800); // Задержка в 800мс для анимации
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateSelectedModel(currentModel);
});

// Обработчик выбора модели
function selectModel(modelId) {
    currentModel = modelId;
    updateSelectedModel(modelId);
    closeModelModal();
}

// Обработчики событий для модального окна
modelSelector.addEventListener('click', openModelModal);
modelModalClose.addEventListener('click', closeModelModal);

// Закрытие модального окна при клике вне его содержимого
modelModal.addEventListener("click", (e) => {
    if (e.target === modelModal) {
        closeModelModal();
    }
});

// Поиск моделей
modelSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    modelItems.forEach(item => {
        const modelName = item.querySelector("h4").textContent.toLowerCase();
        const modelDescription = item.querySelector("p").textContent.toLowerCase();
        const isVisible = modelName.includes(searchTerm) || modelDescription.includes(searchTerm);
        item.style.display = isVisible ? "flex" : "none";
    });
});

// Выбор модели
modelItems.forEach(item => {
    item.addEventListener('click', () => {
        selectModel(item.dataset.model);
    });
});

// Функция для проверки, является ли пользователь новым
function isNewUser() {
    return !localStorage.getItem('hasVisited');
}

// Функция для показа уведомления
function showPromptTour() {
    if (isNewUser()) {
        const input = document.querySelector('.prompt__form-input');
        const tooltip = document.createElement('div');
        tooltip.className = 'tour-tooltip';
        
        // Добавляем кнопку закрытия
        const closeButton = document.createElement('button');
        closeButton.className = 'tour-tooltip__close';
        closeButton.innerHTML = '<i class="bx bx-x"></i>';
        
        // Добавляем текст и кнопку в тултип
        tooltip.innerHTML = 'Find what you need here';
        tooltip.appendChild(closeButton);
        document.body.appendChild(tooltip);

        // Добавляем класс подсветки к инпуту
        input.classList.add('tour-highlight');

        // Позиционируем тултип
        const inputRect = input.getBoundingClientRect();
        tooltip.style.top = (inputRect.top - tooltip.offsetHeight - 30) + 'px';
        tooltip.style.left = (inputRect.left + (inputRect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
        tooltip.classList.add('visible');

        // Сохраняем информацию о том, что пользователь уже видел уведомление
        localStorage.setItem('hasVisited', 'true');

        // Обработчик закрытия тултипа
        closeButton.addEventListener('click', () => {
            tooltip.remove();
            input.classList.remove('tour-highlight');
        });

        // Удаляем уведомление при клике на инпут
        input.addEventListener('click', () => {
            tooltip.remove();
            input.classList.remove('tour-highlight');
        }, { once: true });
    }
}

// Вызываем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', showPromptTour);