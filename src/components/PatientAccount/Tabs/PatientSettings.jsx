import React, { useState } from 'react';

const PatientSettings = ({ userId }) => {
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const { oldPassword, newPassword } = passwordData;

        if (!oldPassword || !newPassword) {
            return alert("Будь ласка, заповніть усі поля для зміни пароля");
        }

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

            if (response.ok) {
                alert('Пароль успішно змінено!');
                setPasswordData({ oldPassword: '', newPassword: '' });
            } else {
                alert(data.message || 'Помилка при зміні пароля');
            }
        } catch (err) {
            console.error(err);
            alert('Помилка сервера при спробі змінити пароль');
        }
    };

    const handleDeleteAccountRequest = async (e) => {
        e.preventDefault();
        if (!confirmPassword) return alert("Введіть ваш поточний пароль для підтвердження!");

        if (window.confirm("Увага! Ви дійсно хочете подати заявку на повне видалення вашого профілю? Цю дію не можна буде скасувати.")) {
            try {
                const token = localStorage.getItem('token'); // БЕЗПЕКА
                const res = await fetch('http://localhost:5000/api/patient/create-admin-request', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // БЕЗПЕКА
                    },
                    body: JSON.stringify({
                        patientId: userId,
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
        <div className="settings-tab">
            <h3>Змінити пароль</h3>
            
            <form onSubmit={handlePasswordChange} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '40px' }}>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '5px', marginTop:'5px', fontSize: '0.9rem' }}>Поточний пароль</label>
                    <input 
                        type="password" 
                        className="form-input" 
                        placeholder="Введіть старий пароль"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                    />
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Новий пароль</label>
                    <input 
                        type="password" 
                        className="form-input" 
                        placeholder="Введіть новий пароль"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                </div>
                <button type="submit" className="save-btn" style={{ padding: '12px', background: '#1a2523', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Оновити пароль
                </button>
            </form>

            <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <div style={{ background: '#fdf2f2', padding: '25px', borderRadius: '15px', border: '1px solid #f5c6cb' }}>
                <h4 style={{ color: '#721c24', marginTop: 0, marginBottom: '10px' }}>🚨 Небезпечна зона: Видалення профілю</h4>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                    Надіслає запит адміністратору на повне видалення вашої медичної карти та акаунту користувача з бази OnyxDent.
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
        </div>
    );
};

export default PatientSettings;