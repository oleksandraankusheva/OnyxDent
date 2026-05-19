import React, { useState } from 'react';

const ChangePassword = ({ userId }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch('http://localhost:5000/api/user/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, oldPassword, newPassword })
        });

        const data = await response.json();
        setMessage(data.message);
        if (response.ok) {
            setOldPassword('');
            setNewPassword('');
        }
    };

    return (
        <div className="change-password-box" style={{ background: 'white', padding: '20px', borderRadius: '15px', marginTop: '20px' }}>
            <h3>Безпека: Зміна пароля</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
                <input 
                    type="password" 
                    placeholder="Поточний пароль" 
                    value={oldPassword} 
                    onChange={(e) => setOldPassword(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Новий пароль" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                />
                <button type="submit" className="save-btn">Оновити пароль</button>
            </form>
            {message && <p style={{ marginTop: '10px', color: message.includes('успішно') ? 'green' : 'red' }}>{message}</p>}
        </div>
    );
};

export default ChangePassword;