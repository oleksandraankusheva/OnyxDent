import React, { useState } from 'react';

const SettingsTab = ({ userId }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    
    // Стейт для підтвердження видалення акаунту
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token'); // БЕЗПЕКА
            const response = await fetch('http://localhost:5000/api/user/change-password', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // БЕЗПЕКА
                },
                body: JSON.stringify({ userId, oldPassword, newPassword })
            });
            const data = await response.json();
            setMessage(data.message);
            if (response.ok) { setOldPassword(''); setNewPassword(''); }
        } catch (err) {
            setMessage("Помилка з'єднання з сервером");
        }
    };

    const handleDeleteAccountRequest = async (e) => {
        e.preventDefault();
        if (!confirmPassword) return alert("Введіть ваш поточний пароль для підтвердження!");

        if (window.confirm("Увага! Ви дійсно хочете подати заявку на повне видалення вашого профілю лікаря? Цю дію не можна буде скасувати.")) {
            try {
                const token = localStorage.getItem('token'); // БЕЗПЕКА
                const res = await fetch('http://localhost:5000/api/patient/create-admin-request', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // БЕЗПЕКА
                    },
                    body: JSON.stringify({
                        patientId: userId, // Передаємо ID поточного лікаря
                        type: 'delete_account',
                        password: confirmPassword
                    })
                });

                if (res.ok) {
                    alert("Заявку на видалення профілю успішно надіслано адміністратору. Ваші дані будуть стерті найближчим часом.");
                    setConfirmPassword('');
                } else {
                    const err = await res.json();
                    alert(err.error || "Помилка безпеки (можливо, введено невірний пароль)");
                }
            } catch (error) {
                console.error(error);
                alert("Помилка з'єднання з сервером");
            }
        }
    };

    return (
        <section className="settings-section">
            <div className="change-password-box">
                <h3>Безпека: Зміна пароля</h3>
                <form onSubmit={handlePasswordChange}>
                    <div className="form-group">
                        <label>Поточний пароль</label>
                        <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Новий пароль</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="save-btn">Оновити пароль</button>
                </form>
                {message && (
                    <p className={message.includes('успішно') ? 'msg-success' : 'msg-error'}>
                        {message}
                    </p>
                )}
            </div>

            {/* Лінія розмежування відповідно до оформлення */}
            <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <div style={{ background: '#fdf2f2', padding: '25px', borderRadius: '15px', border: '1px solid #f5c6cb' }}>
                <h4 style={{ color: '#721c24', marginTop: 0, marginBottom: '10px' }}>🚨 Небезпечна зона: Видалення профілю</h4>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                    Надіслає запит адміністратору на повне видалення акаунту користувача з бази OnyxDent.
                </p>
                <form onSubmit={handleDeleteAccountRequest} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                        type="password" 
                        placeholder="Введіть ваш поточний пароль для підтвердження" 
                        className="form-input"
                        style={{ margin: 0, flex: 1, minWidth: '250px', border: '1px solid #f5c6cb' }}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button type="submit" style={{ padding: '12px 25px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Видалити мій акаунт
                    </button>
                </form>
            </div>
        </section>
    );
};

export default SettingsTab;