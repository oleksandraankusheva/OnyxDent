import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', { transports: ['websocket'] });

const Chat = ({ currentUser, chatWith, userRole, onBack, onSelectContact }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        if (!currentUser?.id) return;

        socket.emit('join_room', currentUser.id);

        const handleReceiveMessage = (data) => {
            if (chatWith && (data.senderId === chatWith.id || data.receiverId === chatWith.id)) {
                setChatHistory((prev) => [...prev, data]);
            }
        };

        socket.on('receive_message', handleReceiveMessage);

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
                if (Array.isArray(data)) setContacts(data); // БЕЗПЕКА
            } catch (err) {
                console.error("Помилка завантаження контактів", err);
            }
        };

        fetchContacts();
        return () => socket.off('receive_message', handleReceiveMessage);
    }, [currentUser?.id, chatWith?.id, userRole]);

    useEffect(() => {
        if (currentUser?.id && chatWith?.id) {
            const token = localStorage.getItem('token'); // БЕЗПЕКА
            fetch(`http://localhost:5000/api/chat/history/${currentUser.id}/${chatWith.id}`, {
                headers: { 'Authorization': `Bearer ${token}` } // БЕЗПЕКА: захищено завантаження історії
            })
                .then(res => {
                    if (res.status === 401) throw new Error("Unauthorized");
                    return res.json();
                })
                .then(data => {
                    if (Array.isArray(data)) setChatHistory(data); // БЕЗПЕКА
                })
                .catch(err => console.error("History load error:", err));
        }
    }, [chatWith?.id, currentUser?.id]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && chatWith?.id) {
            const messageData = {
                senderId: currentUser.id,
                receiverId: chatWith.id,
                text: message,
                time: new Date().toISOString()
            };
            socket.emit('send_message', messageData);
            setChatHistory((prev) => [...prev, messageData]);
            setMessage('');
        }
    };

    const safeContacts = Array.isArray(contacts) ? contacts : []; // БЕЗПЕКА
    const safeChatHistory = Array.isArray(chatHistory) ? chatHistory : []; // БЕЗПЕКА

    return (
        <div className="appointments-section">
            {!chatWith ? (
                <div className="contacts-list">
                    <h3>Оберіть співрозмовника</h3>
                    <div className="contacts-grid" style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
                        {safeContacts.map(c => ( // БЕЗПЕКА
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
                        {safeChatHistory.map((msg, i) => ( // БЕЗПЕКА
                            <div key={i} style={{ textAlign: msg.senderId === currentUser.id ? 'right' : 'left', margin: '10px 0' }}>
                                <div style={{
                                    background: msg.senderId === currentUser.id ? '#1a2523' : '#eef2f1',
                                    color: msg.senderId === currentUser.id ? 'white' : '#1a2523',
                                    padding: '10px 15px', borderRadius: '12px', display: 'inline-block', maxWidth: '80%'
                                }}>
                                    {msg.text}
                                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '5px' }}>
                                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <input
                            type="text"
                            className="search-input"
                            style={{ flexGrow: 1, margin: 0 }}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Напишіть повідомлення..."
                        />
                        <button type="submit" className="save-btn" style={{ padding: '0 25px' }}>Надіслати</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chat;