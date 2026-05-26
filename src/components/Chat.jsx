import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', { transports: ['websocket'] });

const Chat = ({ currentUser, chatWith, userRole, onBack, onSelectContact }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [contacts, setContacts] = useState([]);
    
    // Нові стейти для реалізації редагування
    const [editingMessageId, setEditingMessageId] = useState(null);

    useEffect(() => {
        if (!currentUser?.id) return;

        socket.emit('join_room', currentUser.id);

        // 1. Отримання нового повідомлення в чаті
        const handleReceiveMessage = (data) => {
            if (chatWith && (data.senderId === chatWith.id || data.receiverId === chatWith.id)) {
                setChatHistory((prev) => [...prev, data]);
            }
        };

        // 2. Оновлення повідомлення після отримання події редагування від сервера
        const handleMessageEdited = (data) => {
            setChatHistory((prev) =>
                prev.map((msg) =>
                    msg.id === data.id ? { ...msg, text: data.text, isEdited: true } : msg
                )
            );
        };

        // 3. Видалення повідомлення після отримання події від сервера
        const handleMessageDeleted = (data) => {
            setChatHistory((prev) => prev.filter((msg) => msg.id !== data.id));
        };

        // 4. Синхронізація тимчасового локального повідомлення з реальним ID з бази даних
        const handleMessageSentSuccess = (data) => {
            setChatHistory((prev) =>
                prev.map((msg) =>
                    msg.senderId === currentUser.id && msg.time === data.temporaryTime
                        ? { ...msg, id: data.realId }
                        : msg
                )
            );
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('message_edited', handleMessageEdited);
        socket.on('message_deleted', handleMessageDeleted);
        socket.on('message_sent_success', handleMessageSentSuccess);

        const fetchContacts = async () => {
            const token = localStorage.getItem('token');
            const url = userRole === 'doctor'
                ? `http://localhost:5000/api/doctor/my-patients/${currentUser.id}`
                : `http://localhost:5000/api/patient/my-doctors/${currentUser.id}`;

            try {
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (Array.isArray(data)) setContacts(data);
            } catch (err) {
                console.error("Помилка завантаження контактів", err);
            }
        };

        fetchContacts();

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('message_edited', handleMessageEdited);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('message_sent_success', handleMessageSentSuccess);
        };
    }, [currentUser?.id, chatWith?.id, userRole]);

    useEffect(() => {
        if (currentUser?.id && chatWith?.id) {
            const token = localStorage.getItem('token');
            fetch(`http://localhost:5000/api/chat/history/${currentUser.id}/${chatWith.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (res.status === 401) throw new Error("Unauthorized");
                    return res.json();
                })
                .then(data => {
                    if (Array.isArray(data)) setChatHistory(data);
                })
                .catch(err => console.error("History load error:", err));
        }
    }, [chatWith?.id, currentUser?.id]);

    // Обробник відправки або редагування повідомлення
    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!message.trim() || !chatWith?.id) return;

        if (editingMessageId) {
            // Якщо у нас активний режим редагування
            socket.emit('edit_message', {
                id: editingMessageId,
                receiverId: chatWith.id,
                text: message
            });

            // Оновлюємо локально у себе в масиві
            setChatHistory((prev) =>
                prev.map((msg) =>
                    msg.id === editingMessageId ? { ...msg, text: message, isEdited: true } : msg
                )
            );
            setEditingMessageId(null);
        } else {
            // Звичайне створення нового повідомлення
            const timestamp = new Date().toISOString();
            const messageData = {
                senderId: currentUser.id,
                receiverId: chatWith.id,
                text: message,
                time: timestamp
            };
            socket.emit('send_message', messageData);
            setChatHistory((prev) => [...prev, messageData]);
        }
        setMessage('');
    };

    // Функція тригеру режиму редагування
    const startEdit = (msg) => {
        setEditingMessageId(msg.id);
        setMessage(msg.text);
    };

    // Функція видалення повідомлення
    const deleteMessage = (msgId) => {
        if (!msgId) {
            alert("Повідомлення ще синхронізується з сервером. Спробуйте через секунду.");
            return;
        }
        if (window.confirm("Ви дійсно хочете видалити це повідомлення?")) {
            socket.emit('delete_message', {
                id: msgId,
                receiverId: chatWith.id
            });
            setChatHistory((prev) => prev.filter((msg) => msg.id !== msgId));
            
            // Якщо видаляють те повідомлення, яке зараз редагується
            if (editingMessageId === msgId) {
                setEditingMessageId(null);
                setMessage('');
            }
        }
    };

    const safeContacts = Array.isArray(contacts) ? contacts : [];
    const safeChatHistory = Array.isArray(chatHistory) ? chatHistory : [];

    return (
        <div className="appointments-section">
            {!chatWith ? (
                <div className="contacts-list">
                    <h3>Оберіть співрозмовника</h3>
                    <div className="contacts-grid" style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
                        {safeContacts.map(c => (
                            <div key={c.id} className="contact-card"
                                onClick={() => onSelectContact(c)} 
                                style={{ padding: '15px', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer' }}>
                                <strong>{c.full_name || c.name}</strong>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>{c.phone}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="active-chat">
                    <div className="chat-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                        <button className="close-btn" onClick={onBack}>← До списку</button>
                        <h4>Чат з: {chatWith.full_name || chatWith.name}</h4>
                    </div>
                    <div className="chat-messages" style={{ height: '350px', overflowY: 'auto', padding: '15px', background: '#fcfdfd', borderRadius: '15px', border: '1px solid #eee' }}>
                        {safeChatHistory.map((msg, i) => {
                            const isMyMessage = msg.senderId === currentUser.id;
                            return (
                                <div key={msg.id || i} style={{ textAlign: isMyMessage ? 'right' : 'left', margin: '15px 0' }}>
                                    <div style={{ display: 'inline-block', maxWidth: '80%', textAlign: 'left' }}>
                                        <div style={{
                                            background: isMyMessage ? '#1a2523' : '#eef2f1',
                                            color: isMyMessage ? 'white' : '#1a2523',
                                            padding: '10px 15px', 
                                            borderRadius: '12px',
                                            position: 'relative'
                                        }}>
                                            {msg.text}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', opacity: 0.6, marginTop: '5px', gap: '10px' }}>
                                                <span>
                                                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.isEdited && <span style={{ marginLeft: '5px', fontStyle: 'italic' }}>(редаговано)</span>}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Кнопки Дій (Редагувати / Видалити) відображаються тільки під вашими повідомленнями */}
                                        {isMyMessage && (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '2px', fontSize: '0.75rem' }}>
                                                <button 
                                                    onClick={() => startEdit(msg)} 
                                                    style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: 0 }}
                                                >
                                                    Редагувати
                                                </button>
                                                <button 
                                                    onClick={() => deleteMessage(msg.id)} 
                                                    style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                                                >
                                                    Видалити
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                            {editingMessageId && (
                                <span style={{ fontSize: '0.8rem', color: '#3498db', marginBottom: '4px', fontWeight: 'bold' }}>
                                    📝 Режим редагування повідомлення:
                                </span>
                            )}
                            <input
                                type="text"
                                className="search-input"
                                style={{ margin: 0, width: '100%' }}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={editingMessageId ? "Змініть ваше повідомлення..." : "Напишіть повідомлення..."}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
                            <button type="submit" className="save-btn" style={{ padding: '0 25px', height: '100%', minHeight: '40px' }}>
                                {editingMessageId ? 'Зберегти' : 'Надіслати'}
                            </button>
                            {editingMessageId && (
                                <button 
                                    type="button" 
                                    onClick={() => { setEditingMessageId(null); setMessage(''); }}
                                    style={{ background: '#none', border: '1px solid #ccc', borderRadius: '10px', padding: '0 15px', cursor: 'pointer', height: '100%', minHeight: '40px' }}
                                >
                                    Скасувати
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chat;