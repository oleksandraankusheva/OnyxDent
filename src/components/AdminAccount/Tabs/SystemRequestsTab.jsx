import React, { useState, useEffect } from 'react';

const SystemRequestsTab = ({ onOpenProcessModal, onRefreshAppointments }) => {
    const [siteRequests, setSiteRequests] = useState([]); 
    const [userNotifications, setUserNotifications] = useState([]); 
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const resSite = await fetch('http://localhost:5000/api/admin/requests', { headers });
            const dataSite = await resSite.json();

            const resUser = await fetch('http://localhost:5000/api/admin/notifications', { headers });
            const dataUser = await resUser.json();

            if (Array.isArray(dataSite)) setSiteRequests(dataSite.filter(r => r.status === 'pending'));
            if (Array.isArray(dataUser)) setUserNotifications(dataUser);
        } catch (error) {
            console.error("Помилка синхронізації заявок:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUserAction = async (id, type, appointmentId, patientId, action) => {
        const token = localStorage.getItem('token');
        let url = '';
        let method = 'DELETE';
        let body = null;

        if (action === 'reject') {
            // Якщо адмін відхиляє запит на скидання або скасування — просто видаляємо нотифікацію
            url = `http://localhost:5000/api/admin/notifications/${id}`;
            method = 'DELETE';
            try {
                const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    alert("Заявку відхилено та видалено");
                    fetchData();
                }
            } catch (err) { console.error(err); }
            return;
        }

        if (type === 'delete_account') {
            url = `http://localhost:5000/api/admin/users/${patientId}`;
            body = JSON.stringify({ notificationId: id });
            method = 'DELETE';
        } else if (type === 'cancel_appointment') {
            url = `http://localhost:5000/api/admin/notifications/cancel-appointment/${id}`;
            body = JSON.stringify({ appointmentId });
            method = 'DELETE';
        } else if (type === 'reset_password') {
            // ОНОВЛЕНО: Маршрут для скидання пароля
            url = `http://localhost:5000/api/admin/notifications/reset-password/${id}`;
            body = JSON.stringify({ patientId });
            method = 'PUT'; // Зазвичай для модифікації паролів
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });

            const data = await res.json();

            if (res.ok) {
                if (type === 'reset_password' && data.newPassword) {
                    // Показуємо адміну новий автоматично згенерований тимчасовий пароль
                    alert(`Пароль успішно скинуто!\nНовий згенерований пароль пацієнта: ${data.newPassword}\n\nБудь ласка, передайте його пацієнту.`);
                } else {
                    alert("Дію успішно виконано в системі!");
                }
                fetchData();
                if (onRefreshAppointments) onRefreshAppointments();
            } else {
                alert(data.error || "Помилка виконання дії");
            }
        } catch (err) { 
            console.error(err); 
        }
    };

    const handleRejectSiteRequest = async (id) => {
        if (window.confirm("Ви дійсно хочете видалити запит?")) {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/admin/requests/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            }
        }
    };

    if (loading) return <p>Завантаження єдиного реєстру заявок...</p>;

    const safeSite = Array.isArray(siteRequests) ? siteRequests : [];
    const safeUser = Array.isArray(userNotifications) ? userNotifications : [];
    const totalCount = safeSite.length + safeUser.length;

    return (
        <section className="requests-tab-section" style={{ background: 'white', padding: '30px', borderRadius: '20px' }}>
            <h3>🔔 Центр обробки запитів користувачів OnyxDent</h3>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '0.9rem' }}>
                Сюди надходять швидкі бронювання з вебсайту, записи авторизованих пацієнтів, а також системні запити на скасування візитів, скидання паролів чи видалення профайлів.
            </p>

            <div className="requests-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {totalCount === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#777' }}>Нових системних запитів немає. Усе опрацьовано! ✨</p>
                ) : (
                    <>
                        {safeSite.map((req) => {
                            const isRegistered = req.registered_user_id ? true : false;
                            return (
                                <div key={`site-${req.id}`} className="request-card" style={{
                                    border: '1px solid #e0e0e0', 
                                    borderRadius: '12px', 
                                    padding: '20px', 
                                    background: isRegistered ? '#f4f9f4' : '#fdfdfd', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    gap: '20px', 
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ flexGrow: 1 }}>
                                        <span style={{ 
                                            background: isRegistered ? '#27ae60' : '#3498db', 
                                            color: 'white', 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold' 
                                        }}>
                                            {isRegistered ? 'Запит з кабінету 📱' : 'Заявка з сайту 🌐'}
                                        </span>
                                        <h4 style={{ margin: '10px 0 5px 0' }}>
                                            {isRegistered ? 'Пацієнт:' : 'Клієнт:'} {req.patient_name}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>📞 Телефон: {req.patient_phone}</p>
                                        <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#666' }}>🦷 Послуга: <b>{req.service_title || 'Консультація'}</b></p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            className="add-btn" 
                                            onClick={() => onOpenProcessModal(req, !isRegistered)} 
                                            style={{ padding: '10px 18px', fontWeight: 'bold' }}
                                        >
                                            Обробити запис
                                        </button>
                                        <button 
                                            onClick={() => handleRejectSiteRequest(req.id)} 
                                            style={{ background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Відхилити
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {safeUser.map((req) => {
                            // ОНОВЛЕНО: Окремі колірні стилі для типу reset_password
                            const isPasswordReset = req.type === 'reset_password';
                            const isDeleteAccount = req.type === 'delete_account';
                            
                            let cardBg = '#fdfdfd';
                            if (isDeleteAccount) cardBg = '#fff5f5';
                            if (isPasswordReset) cardBg = '#f0f7ff'; // легкий блакитний фон для паролів

                            return (
                                <div key={`user-${req.id}`} className="request-card" style={{
                                    border: '1px solid #e0e0e0', 
                                    borderRadius: '12px', 
                                    padding: '20px', 
                                    background: cardBg,
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    gap: '20px', 
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}>
                                    <div style={{ flexGrow: 1 }}>
                                        <span style={{
                                            background: isPasswordReset ? '#2980b9' : (req.type === 'cancel_appointment' ? '#f39c12' : '#e74c3c'),
                                            color: 'white', 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold'
                                        }}>
                                            {isPasswordReset ? 'Втрата пароля 🔐' : (req.type === 'cancel_appointment' ? 'Скасування візиту ❌' : 'Видалення профілю 🚨')}
                                        </span>
                                        <h4 style={{ margin: '10px 0 5px 0' }}>Пацієнт: {req.patient_name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>📞 Телефон: {req.patient_phone}</p>
                                        
                                        {isPasswordReset && (
                                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#7f8c8d', fontStyle: 'italic' }}>
                                                Запит сформовано автоматично з форми авторизації. Підтвердження згенерує новий тимчасовий пароль.
                                            </p>
                                        )}
                                        
                                        {req.service_title && <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#666' }}>Прийом: <b>{req.service_title}</b> від {new Date(req.appointment_date).toLocaleDateString('uk-UA')}</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleUserAction(req.id, req.type, req.appointment_id, req.patient_id, 'approve')} 
                                            style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Підтвердити
                                        </button>
                                        <button 
                                            onClick={() => handleUserAction(req.id, req.type, req.appointment_id, req.patient_id, 'reject')} 
                                            style={{ background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Відхилити
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </section>
    );
};

export default SystemRequestsTab;