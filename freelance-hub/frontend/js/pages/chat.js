// Chat Messenger & Communication Page Module
import Api from '../api.js';
import Store from '../store.js';
import { showToast } from '../router.js';
import { formatTime } from '../utils.js';

let activeReceiverId = null;
let activeProjectId = null;
let messagePollInterval = null;
let lastMessageCount = 0;

export async function renderChat(container, params) {
    // Clean up any existing chat intervals on navigation ticks
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
    
    // Parse params if contact target passed directly (e.g. #chat?receiver_id=4)
    activeReceiverId = params ? (params.receiver_id || null) : null;
    activeProjectId = params ? (params.project_id || null) : null;
    lastMessageCount = 0;
    
    container.innerHTML = `
        <div class="chat-page page-fade-in">
            <div style="margin-bottom: 24px;">
                <h2>Workspace Discussions</h2>
                <p style="color: var(--text-secondary); font-size: 14px;">Real-time messaging, file sharing, and contract negotiation portal</p>
            </div>

            <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px; height: 620px; align-items: stretch;">
                <!-- Left Pane: Chat list -->
                <div class="card" style="display: flex; flex-direction: column; padding: 20px; height: 100%;">
                    <h4 style="margin-bottom: 12px; font-size: 12px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Active Contacts</h4>
                    <div id="chat-contacts-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                        <div class="loading-spinner-container"><div class="spinner"></div></div>
                    </div>
                </div>

                <!-- Right Pane: Message box -->
                <div id="chat-window-viewport">
                    <div class="card" style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted);">
                        <div>
                            <i class="far fa-comments" style="font-size: 60px; margin-bottom: 16px; opacity: 0.3;"></i>
                            <h3>Select a Contact</h3>
                            <p style="margin-top: 8px; font-size: 14px;">Pick a contract partner on the left to inspect discussion logs.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadContacts();
    
    if (activeReceiverId) {
        await selectContact(activeReceiverId, activeProjectId);
    }
    
    // Auto-clear interval when hash changes (user navigates away)
    const cleanupOnHash = () => {
        if (messagePollInterval) {
            clearInterval(messagePollInterval);
            messagePollInterval = null;
        }
        window.removeEventListener('hashchange', cleanupOnHash);
    };
    window.addEventListener('hashchange', cleanupOnHash);
}

async function loadContacts() {
    const listDiv = document.getElementById('chat-contacts-list');
    const res = await Api.get('/chat/active-chats');
    if (!res.ok) {
        listDiv.innerHTML = `<p class="text-danger">${res.error}</p>`;
        return;
    }

    const contacts = res.data;
    if (contacts.length === 0) {
        listDiv.innerHTML = `
            <p style="color: var(--text-muted); font-size: 12.5px; text-align: center; padding-top: 20px;">No message history recorded yet.</p>
        `;
        return;
    }

    let html = '';
    contacts.forEach(c => {
        const isSelected = activeReceiverId && Number(activeReceiverId) === Number(c.id);
        const initials = c.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        
        html += `
            <div class="chat-contact-item ${isSelected ? 'active' : ''}" data-id="${c.id}" style="display: flex; gap: 10px; align-items: center; padding: 10px; border-radius: var(--radius-md); cursor: pointer; transition: background var(--transition-fast);">
                <div style="width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--primary-color); color: #fff; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center;">
                    ${initials}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-color);">${c.full_name}</div>
                    <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.display_title}</div>
                </div>
            </div>
        `;
    });

    listDiv.innerHTML = html;

    // Bind Contact Selectors
    listDiv.querySelectorAll('.chat-contact-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-id');
            // Remove active from others
            listDiv.querySelectorAll('.chat-contact-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            await selectContact(id);
        });
    });
}

async function selectContact(receiverId, projectId = null) {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
    
    activeReceiverId = receiverId;
    activeProjectId = projectId;
    lastMessageCount = 0;
    
    const viewport = document.getElementById('chat-window-viewport');
    viewport.innerHTML = `
        <div class="chat-window">
            <div class="chat-header">
                <div id="active-chat-title">
                    <strong style="font-size: 16px;">Loading conversation...</strong>
                </div>
            </div>
            
            <div class="chat-messages" id="chat-msg-scroller">
                <div class="loading-spinner-container"><div class="spinner"></div></div>
            </div>
            
            <form id="chat-message-send-form" class="chat-input-area">
                <input type="file" id="chat-file-input" style="display: none;">
                <button type="button" id="chat-file-trigger" class="attachment-label" title="Attach Document (PDF, ZIP, Image)"><i class="fas fa-paperclip"></i></button>
                <span id="chat-file-indicator" style="font-size: 11px; color: var(--warning-color); display: none; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
                
                <input type="text" id="chat-text-input" class="chat-input" placeholder="Type your message here..." required autocomplete="off">
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>
    `;

    // Bind inputs
    const fileInput = document.getElementById('chat-file-input');
    const triggerBtn = document.getElementById('chat-file-trigger');
    const fileLabel = document.getElementById('chat-file-indicator');
    const form = document.getElementById('chat-message-send-form');
    
    triggerBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileLabel.textContent = file.name;
            fileLabel.style.display = 'inline';
            triggerBtn.style.color = 'var(--warning-color)';
        } else {
            fileLabel.style.display = 'none';
            triggerBtn.style.color = 'var(--text-secondary)';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textInp = document.getElementById('chat-text-input');
        const text = textInp.value.trim();
        const file = fileInput.files[0];
        
        if (!text && !file) return;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('receiver_id', activeReceiverId);
        if (activeProjectId) formData.append('project_id', activeProjectId);
        if (text) formData.append('message_text', text);
        if (file) formData.append('file', file);
        
        const sendRes = await Api.post('/chat/messages', formData);
        if (sendRes.ok) {
            textInp.value = '';
            fileInput.value = '';
            fileLabel.style.display = 'none';
            triggerBtn.style.color = 'var(--text-secondary)';
            
            // Append message directly & scroll
            appendSingleMessage(sendRes.data);
            scrollChatToBottom();
        } else {
            showToast(sendRes.error, 'danger');
        }
        submitBtn.disabled = false;
    });

    // Initial message pull
    await fetchMessages();
    
    // Start Poll (3 seconds interval)
    messagePollInterval = setInterval(fetchMessages, 3000);
}

async function fetchMessages() {
    if (!activeReceiverId) return;
    
    const url = `/chat/messages?receiver_id=${activeReceiverId}${activeProjectId ? `&project_id=${activeProjectId}` : ''}`;
    const res = await Api.get(url);
    if (!res.ok) return;

    const messages = res.data;
    
    // Update Header Partner details from first message or state
    if (messages.length > 0) {
        const titleEl = document.getElementById('active-chat-title');
        if (titleEl) {
            const sample = messages[0];
            const partnerName = Number(sample.sender_id) === Number(Store.user.id) ? sample.receiver_name : sample.sender_name;
            titleEl.innerHTML = `
                <strong style="font-size: 16px;">${partnerName}</strong>
                <p style="font-size: 11px; color: var(--text-muted);">Ongoing negotiations thread</p>
            `;
        }
    }

    // Render if count changed (avoid redrawing layout repeatedly)
    if (messages.length !== lastMessageCount) {
        lastMessageCount = messages.length;
        renderMessageScroller(messages);
    }
}

function renderMessageScroller(messages) {
    const scroller = document.getElementById('chat-msg-scroller');
    if (!scroller) return;

    if (messages.length === 0) {
        scroller.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 13.5px; padding-top: 50px;">
                <i class="far fa-comment-dots" style="font-size: 32px; margin-bottom: 8px;"></i>
                <p>No messages in this chat. Type below to begin the discussion.</p>
            </div>
        `;
        return;
    }

    let html = '';
    messages.forEach(msg => {
        const isSent = Number(msg.sender_id) === Number(Store.user.id);
        const time = formatTime(msg.created_at, { hour: '2-digit', minute: '2-digit' });
        
        let contentHTML = '';
        
        // System message indicator
        const isSystem = msg.message_text && msg.message_text.startsWith('[SYSTEM:');
        
        if (isSystem) {
            contentHTML = `
                <div class="msg-bubble msg-system">
                    <i class="fas fa-info-circle"></i> ${msg.message_text.replace('[SYSTEM: ', '').replace(']', '')}
                    <div class="msg-meta">${time}</div>
                </div>
            `;
        } else {
            let fileAttachmentHTML = '';
            if (msg.file_url) {
                const isImage = msg.file_name.match(/\.(jpg|jpeg|png|gif)$/i);
                if (isImage) {
                    fileAttachmentHTML = `
                        <div style="margin-top: 8px;">
                            <img src="${msg.file_url}" style="max-width: 100%; max-height: 200px; border-radius: var(--radius-sm); border:1px solid var(--border-color);" alt="${msg.file_name}"><br>
                            <a href="${msg.file_url}" target="_blank" style="font-size: 11px; text-decoration: underline; color: inherit;"><i class="fas fa-external-link-alt"></i> Open Full Image</a>
                        </div>
                    `;
                } else {
                    fileAttachmentHTML = `
                        <div style="margin-top: 8px; padding: 10px; border-radius: var(--radius-sm); background-color: rgba(255,255,255,0.08); border: 1px solid var(--border-color); display: flex; gap: 8px; align-items: center;">
                            <i class="fas fa-file-download" style="font-size: 18px;"></i>
                            <div style="min-width: 0; flex: 1;">
                                <a href="${msg.file_url}" target="_blank" style="font-size:12px; font-weight:600; text-decoration: underline; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit;">${msg.file_name}</a>
                                <span style="font-size: 9px; opacity: 0.6;">Attachment Document</span>
                            </div>
                        </div>
                    `;
                }
            }

            contentHTML = `
                <div class="msg-bubble ${isSent ? 'msg-sent' : 'msg-received'}">
                    ${msg.message_text ? `<div>${msg.message_text}</div>` : ''}
                    ${fileAttachmentHTML}
                    <div class="msg-meta" style="${isSent ? 'color:rgba(255,255,255,0.7);' : 'color:var(--text-muted);'}">${time}</div>
                </div>
            `;
        }

        html += contentHTML;
    });

    scroller.innerHTML = html;
    scrollChatToBottom();
}

function appendSingleMessage(msg) {
    const scroller = document.getElementById('chat-msg-scroller');
    if (!scroller) return;
    
    // Remove empty placeholder
    const empty = scroller.querySelector('div[style*="text-align: center"]');
    if (empty) empty.remove();
    
    const isSent = Number(msg.sender_id) === Number(Store.user.id);
    const time = formatTime(msg.created_at, { hour: '2-digit', minute: '2-digit' });
    
    const div = document.createElement('div');
    div.className = `msg-bubble ${isSent ? 'msg-sent' : 'msg-received'}`;
    
    let fileAttachmentHTML = '';
    if (msg.file_url) {
        fileAttachmentHTML = `
            <div style="margin-top: 8px; padding: 8px; border-radius: 4px; background: rgba(0,0,0,0.1); border: 1px solid var(--border-color); display: flex; gap: 6px; align-items: center;">
                <i class="fas fa-file"></i>
                <a href="${msg.file_url}" target="_blank" style="font-size:11px; text-decoration: underline; color: inherit;">${msg.file_name}</a>
            </div>
        `;
    }

    div.innerHTML = `
        ${msg.message_text ? `<div>${msg.message_text}</div>` : ''}
        ${fileAttachmentHTML}
        <div class="msg-meta" style="${isSent ? 'color:rgba(255,255,255,0.7);' : 'color:var(--text-muted);'}">${time}</div>
    `;
    
    scroller.appendChild(div);
    lastMessageCount++;
}

function scrollChatToBottom() {
    const scroller = document.getElementById('chat-msg-scroller');
    if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
    }
}
